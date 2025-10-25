# src/graph/nodes.py
from __future__ import annotations

import re
from typing import List, Tuple

import google.generativeai as genai

from src.config import Config
from src.retriever.vectorstore import VectorStore
from src.utils.logger import log_info, log_warning


# --- LLM (Gemini) init (güvenli) ---
if Config.GOOGLE_API_KEY:
    genai.configure(api_key=Config.GOOGLE_API_KEY)
else:
    # Çalışır; ancak LLM çağrısında uyarı verelim
    log_warning("[LLM] GOOGLE_API_KEY bulunamadı. LLM çağrıları hata verebilir.")


# ===========================
#  Query Router (Yeni)
# ===========================
class QueryRouterNode:
    """
    Sorguyu üç kategoriye ayırır:
    - DOMAIN: indeks (Chroma) ile ilgili (kurum içi bilgi)
    - WEB: güncel/dış dünya (web arama)
    - GENERIC_CHAT: selamlama/sohbet/genel kullanım
    Heuristik + (varsa) LLM fallback ile karar verir.
    """

    DOMAIN_HINTS = [
        "ailayzer", "kurumsal", "hizmet", "şirket", "müşteri",
        "sözleşme", "ürün", "profil", "organizasyon"
    ]
    WEB_HINTS = [
        "hava durumu", "bugün", "şu an", "güncel", "haber",
        "fiyat", "kur", "son durum", "yarın", "haftaya"
    ]
    CHITCHAT_HINTS = [
        "merhaba", "selam", "naber", "ne yapabilirsin", "konuş",
        "kendini tanıt", "yardım edebilir misin", "sohbet"
    ]

    def classify(self, question: str) -> dict:
        q = (question or "").strip().lower()

        # hızlı/ucuz heuristik
        if any(k in q for k in self.DOMAIN_HINTS):
            return {"route": "DOMAIN", "normalized_question": question}

        if any(k in q for k in self.WEB_HINTS):
            return {"route": "WEB", "normalized_question": question}

        if any(k in q for k in self.CHITCHAT_HINTS) or len(q) <= 10:
            return {"route": "GENERIC_CHAT", "normalized_question": question}

        # LLM fallback (varsa)
        if Config.GOOGLE_API_KEY:
            prompt = f"""Soru: "{question}"

Bu soruyu sınıflandır:
- DOMAIN: indeks/kurum içi bilgi ile ilgili
- WEB: dış dünya/güncel bilgi gerektiren
- GENERIC_CHAT: selamlama/sohbet/genel

Sadece şu formatta yanıt ver:
route=DOMAIN|WEB|GENERIC_CHAT
"""
            model = genai.GenerativeModel(Config.MODEL_NAME)
            try:
                resp = model.generate_content(prompt)
                raw = (resp.text or "").strip().upper()
                if "DOMAIN" in raw:
                    return {"route": "DOMAIN", "normalized_question": question}
                if "WEB" in raw:
                    return {"route": "WEB", "normalized_question": question}
            except Exception:
                pass  # heuristik fallback

        return {"route": "GENERIC_CHAT", "normalized_question": question}


# ===========================
#  Retriever
# ===========================
class RetrieverNode:
    """ChromaDB üzerinden benzer içerikleri getirir."""
    def __init__(self, collection_name: str = "rag_docs"):
        self.vdb = VectorStore(collection_name=collection_name)

    def run(self, query: str, k: int = 4) -> List[str]:
        docs = self.vdb.query(query, n=k)
        return docs


# ===========================
#  Retriever Grader
# ===========================
class RetrieverGraderNode:
    """
    Basit uygunluk puanlayıcı:
    - Token kesişimi / keyword örtüşmesi
    - Case-insensitive / basit normalizasyon
    Dönüş: [(doc, score), ...] skor desc.
    """
    def _score(self, question: str, doc: str) -> float:
        q = re.findall(r"\w+", question.lower())
        d = re.findall(r"\w+", (doc or "").lower())
        if not q or not d:
            return 0.0
        inter = len(set(q) & set(d))
        return inter / max(3, len(set(q)))  # normalize, aşırı cezalandırma yok

    def run(self, question: str, docs: List[str], min_thresh: float = 0.05) -> List[Tuple[str, float]]:
        scored = [(doc, self._score(question, doc)) for doc in docs]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [x for x in scored if x[1] >= min_thresh]


# ===========================
#  Generator (Gemini)
# ===========================
class GeneratorNode:
    """
    Soru+bağlam ile Gemini'den cevap üretir.
    """
    def __init__(self):
        self.model = genai.GenerativeModel(Config.MODEL_NAME)

    def run(self, question: str, context: str) -> str:
        prompt = f"""You are a helpful assistant. Use ONLY the context if available.

Context:
\"\"\"{context or ''}\"\"\"

Question: {question}

Instructions:
- Answer in Turkish.
- If the answer is not in the context, say you don't have enough information.
- Be concise and accurate.
"""
        resp = self.model.generate_content(prompt)
        return (resp.text or "").strip()


# ===========================
#  Hallucination Check
# ===========================
class HallucinationNode:
    """
    Çok basit sadakat metriği:
    - Cevaptaki kelimelerin ne kadarı bağlamda da geçiyor?
    0.0 ~ 1.0
    """
    def run(self, answer: str, context: str) -> float:
        a = set(re.findall(r"\w+", (answer or "").lower()))
        c = set(re.findall(r"\w+", (context or "").lower()))
        if not a or not c:
            return 0.0
        overlap = len(a & c) / max(1, len(a))
        return round(min(1.0, max(0.0, overlap)), 2)


# ===========================
#  Answer Quality Grader
# ===========================
class AnswerGraderNode:
    """
    Basit kalite metriği:
    - Uzunluk + min. yapısal sinyal
    """
    def run(self, answer: str) -> float:
        if not answer:
            return 0.0
        words = len(answer.split())
        caps = 0.05 if answer[:1].isupper() else 0.0
        score = min(1.0, (words / 80.0) + caps)
        return round(score, 2)
