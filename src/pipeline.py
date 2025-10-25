# src/pipeline.py
from __future__ import annotations

import os
from typing import Dict, Any, List

import google.generativeai as genai

from src.config import Config
from src.graph.graph_builder import RAGGraph
from src.graph.nodes import QueryRouterNode
from src.retriever.web_search import TavilySearch
from src.utils.logger import log_info, log_success, log_warning, log_error
from src.utils.state_tracker import StateTracker


# --- LangChain Cloud tracing (opsiyonel) ---
if getattr(Config, "LANGCHAIN_TRACING", False) and getattr(Config, "LANGCHAIN_API_KEY", ""):
    os.environ["LANGCHAIN_API_KEY"] = Config.LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = getattr(Config, "LANGCHAIN_PROJECT", "rag-gemini-langgraph")
    os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
    print("[TRACE] LangChain Cloud tracing aktif.")
else:
    print("[TRACE] LangChain tracing pasif.")

# --- LLM init ---
if Config.GOOGLE_API_KEY:
    genai.configure(api_key=Config.GOOGLE_API_KEY)
else:
    log_warning("[LLM] GOOGLE_API_KEY bulunamadı. LLM çağrıları hata verebilir.")


def _direct_llm_answer(question: str) -> str:
    """GENERIC_CHAT için hızlı yanıt."""
    model = genai.GenerativeModel(Config.MODEL_NAME)
    prompt = f"""Kullanıcı sorusu: {question}
Türkçe, kısa ve net bir yanıt ver."""
    resp = model.generate_content(prompt)
    return (resp.text or "").strip()


def _web_search_answer(question: str) -> Dict[str, Any]:
    """WEB rotası: Tavily + LLM."""
    tav = TavilySearch()
    snippets: List[str] = tav.search(question) or []
    top = " ".join(snippets[:3])

    model = genai.GenerativeModel(Config.MODEL_NAME)
    prompt = f"""Context (web araması sonuçları):
\"\"\"{top}\"\"\"

Soru: {question}

Talimat:
- Türkçe yanıt ver.
- Bağlam yoksa uydurma yapma, emin değilsen belirt.
"""
    try:
        resp = model.generate_content(prompt)
        answer = (resp.text or "").strip()
    except Exception as e:
        log_error(f"[WEB] LLM hata: {e}")
        answer = "Web sonuçlarını işlerken bir hata oluştu."

    # basit skorlar
    halluc = 0.9 if top else 0.4
    grade = 1.0 if len(answer.split()) > 30 else 0.6

    return {
        "source": "web_search",
        "answer": answer,
        "hallucination_score": round(halluc, 2),
        "answer_grade": round(grade, 2),
        "docs": snippets,
    }


def run_rag(user_query: str) -> Dict[str, Any]:
    """
    Ana giriş noktası. Verdiğin diyagramdaki gibi önce Query Analysis:
      - GENERIC_CHAT → direkt LLM
      - WEB → Tavily + LLM
      - DOMAIN → RAG + self-reflection
    """
    state = StateTracker()
    router = QueryRouterNode()
    route_info = router.classify(user_query)
    route = route_info["route"]
    normalized_q = route_info["normalized_question"]

    log_info(f"[Router] route={route} question='{normalized_q}'")

    # 1) GENERIC_CHAT
    if route == "GENERIC_CHAT":
        answer = _direct_llm_answer(normalized_q)
        result = {
            "query": user_query,
            "source": "generic_llm",
            "answer": answer,
            "hallucination_score": 1.0,
            "answer_grade": 1.0,
            "docs": [],
        }
        state.log_state(user_query, answer, {"hallucination": 1.0, "grade": 1.0})
        log_success("GENERIC_CHAT cevabı üretildi.")
        return result

    # 2) WEB
    if route == "WEB":
        web = _web_search_answer(normalized_q)
        result = {"query": user_query, **web}
        state.log_state(user_query, result["answer"], {
            "hallucination": result["hallucination_score"],
            "grade": result["answer_grade"],
        })
        log_success("WEB cevabı üretildi.")
        return result

    # 3) DOMAIN → RAG hattı
    g = RAGGraph()

    log_info("[RAG] Retrieving documents...")
    docs = g.retriever.run(normalized_q, k=4)

    log_info("[RAG] Grading retrieved docs...")
    graded = g.retriever_grader.run(normalized_q, docs, min_thresh=0.05)

    # Self-reflection: hiç alakalı doküman yoksa soruyu yeniden yaz ve tekrar dene
    if not graded:
        log_info("[RAG] No relevant docs. Attempting rewrite...")
        rewrite_prompt = f"""Soru:
{normalized_q}

Bu soruyu, kurumsal profil/şirket bilgisi perspektifinden daha iyi retrieval yapacak şekilde yeniden yaz.
Sadece yeniden yazılmış soruyu döndür.
"""
        try:
            model = genai.GenerativeModel(Config.MODEL_NAME)
            resp = model.generate_content(rewrite_prompt)
            rewritten = (resp.text or "").strip()
            if rewritten and rewritten.lower() != normalized_q.lower():
                docs = g.retriever.run(rewritten, k=4)
                graded = g.retriever_grader.run(rewritten, docs, min_thresh=0.05)
                normalized_q = rewritten  # yeni soruyla devam et
        except Exception as e:
            log_warning(f"[RAG] Rewrite denemesi başarısız: {e}")

    # Eğer hâlâ yoksa (ör. AILAYZER index’te değil) → WEB fallback
    if not graded:
        log_warning("[RAG] İlgili doküman bulunamadı, WEB fallback devreye alınıyor.")
        web = _web_search_answer(normalized_q)
        result = {"query": user_query, **web}
        state.log_state(user_query, result["answer"], {
            "hallucination": result["hallucination_score"],
            "grade": result["answer_grade"],
        })
        return result

    context = " ".join([d for d, _ in graded[:2]])

    log_info("[RAG] Generating answer with Gemini...")
    answer = g.generator.run(normalized_q, context)

    halluc_score = g.hallucination.run(answer, context)
    ans_score = g.answer_grader.run(answer)

    result = {
        "query": user_query,
        "source": "chroma_db",
        "answer": answer,
        "hallucination_score": halluc_score,
        "answer_grade": ans_score,
        "docs": [d for d, _ in graded],
    }

    state.log_state(user_query, answer, {"hallucination": halluc_score, "grade": ans_score})
    log_success("RAG işlem tamamlandı (DOMAIN).")
    return result
