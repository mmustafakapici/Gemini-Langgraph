from __future__ import annotations

import os
from typing import Dict, Any, List, AsyncGenerator, Any as AnyType

import google.generativeai as genai

from src.config import Config
from src.graph.graph_builder import RAGGraph
from src.graph.nodes import QueryRouterNode
from src.retriever.web_search import TavilySearch
from src.utils.logger import (
    log_info,
    log_success,
    log_warning,
    log_error,
)
import asyncio
from src.utils.state_tracker import StateTracker
from src.memory.session_store import get_memory  # session-based memory


# =====================================================
# LangChain Tracing Opsiyonel
# =====================================================
if getattr(Config, "LANGCHAIN_TRACING", False) and getattr(Config, "LANGCHAIN_API_KEY", ""):
    os.environ["LANGCHAIN_API_KEY"] = Config.LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = getattr(Config, "LANGCHAIN_PROJECT", "rag-gemini-langgraph")
    os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
    print("[TRACE] LangChain Cloud tracing aktif.")
else:
    print("[TRACE] LangChain tracing pasif.")


# =====================================================
# Gemini API Configure
# =====================================================
if Config.GOOGLE_API_KEY:
    genai.configure(api_key=Config.GOOGLE_API_KEY)
else:
    log_warning("[LLM] GOOGLE_API_KEY bulunamadı → LLM çağrıları hata verebilir.")


# =====================================================
# Heuristik: takip sorusu tespiti
# =====================================================
FOLLOWUP_KEYWORDS = [
    "benim adım", "adım ne", "ben kimim", "neymiş benim",
    "az önce", "daha önce", "devam et", "devam eder misin",
    "ne demiştin", "tekrar anlat", "bana tekrar söyle",
    "özetle", "kısaca tekrar", "neydi", "hatırlat",
    "kimdim", "neyim",
]

def _looks_like_followup(question: str) -> bool:
    q_lower = question.lower().strip()
    word_count = len(q_lower.split())
    if word_count <= 8:
        for kw in FOLLOWUP_KEYWORDS:
            if kw in q_lower:
                return True
        if "ben " in q_lower or "benim" in q_lower:
            return True
    return False


# =====================================================
# LLM yardımcıları
# =====================================================
def _direct_llm_answer(question: str, history_context: str) -> str:
    log_info("[GENERIC_CHAT] LLM answering with memory...")
    model = genai.GenerativeModel(Config.MODEL_NAME)

    prompt = f"""
Geçmiş konuşma özeti:
{history_context}

Kullanıcının yeni mesajı:
{question}

Bağlamı koruyarak Türkçe ve net cevap ver.
Cevabı **mutlaka Markdown formatında** üret; sadece markdown içeriği döndür.
"""
    resp = model.generate_content(prompt)
    return (resp.text or "").strip()


def _web_search_answer(question: str, history_context: str) -> Dict[str, Any]:
    log_info("[WEB] Tavily searching...")
    tav = TavilySearch()
    snippets = tav.search(question) or []
    top = " ".join(snippets[:3])

    model = genai.GenerativeModel(Config.MODEL_NAME)
    prompt = f"""
Geçmiş konuşma özeti:
{history_context}

Web arama sonuçları:
{top}

Soru: {question}

Sadece bu bağlamı kullanarak Türkçe, profesyonel bir yanıt üret.
Emin olmadığın noktaları varsayma.
Cevabı **mutlaka Markdown formatında** üret; sadece markdown içeriği döndür.
"""
    try:
        resp = model.generate_content(prompt)
        answer = (resp.text or "").strip()
    except Exception as e:
        log_error(f"[WEB] LLM error: {e}")
        answer = "Web sonuçlarını işlerken bir hata oluştu."

    halluc = 0.95 if top else 0.50
    grade = 1.0 if len(answer.split()) > 20 else 0.60

    return {
        "source": "web_search",
        "answer": answer,
        "hallucination_score": round(halluc, 2),
        "answer_grade": round(grade, 2),
        "docs": snippets,
    }


# =====================================================
# Ana RAG Çalıştırıcısı (stateful sync)
# =====================================================
def run_rag(user_query: str, session_id: str) -> Dict[str, Any]:
    state = StateTracker()
    memory = get_memory(session_id)

    router = QueryRouterNode()
    route_info = router.classify(user_query)
    route = route_info["route"]
    normalized_q = route_info["normalized_question"]

    history_context = memory.build_context()

    # FOLLOWUP override (ör: "benim adım neydi?")
    if route == "DOMAIN" and _looks_like_followup(normalized_q):
        log_warning("[Router Override] Kısa kişisel takip sorusu algılandı → GENERIC_CHAT'a force ediliyor.")
        route = "GENERIC_CHAT"

    log_info(f"[Router] route={route} session={session_id} → '{normalized_q}'")

    # 1. GENERIC_CHAT
    if route == "GENERIC_CHAT":
        answer = _direct_llm_answer(normalized_q, history_context)

        out = {
            "query": user_query,
            "source": "generic_llm",
            "answer": answer,
            "hallucination_score": 1.0,
            "answer_grade": 1.0,
            "docs": [],
        }

        memory.add_turn(user_query, answer)
        state.log_state(user_query, answer, {"hallucination": 1.0, "grade": 1.0})
        log_success("[GENERIC_CHAT] ✅")
        return out

    # 2. WEB
    if route == "WEB":
        web = _web_search_answer(normalized_q, history_context)

        memory.add_turn(user_query, web["answer"])
        state.log_state(
            user_query,
            web["answer"],
            {
                "hallucination": web["hallucination_score"],
                "grade": web["answer_grade"],
            },
        )
        log_success("[WEB] ✅")
        return {
            "query": user_query,
            "source": web["source"],
            "answer": web["answer"],
            "hallucination_score": web["hallucination_score"],
            "answer_grade": web["answer_grade"],
            "docs": web["docs"],
        }

    # 3. DOMAIN → ChromaDB RAG
    g = RAGGraph()

    log_info("[RAG] Retrieving documents...")
    docs = g.retriever.run(normalized_q, k=4)

    log_info("[RAG] Grading retrieved docs...")
    graded = g.retriever_grader.run(normalized_q, docs, min_thresh=0.05)

    # Hiç ilgili yoksa → rewrite yap, yeniden dene
    if not graded:
        log_warning("[RAG] No docs → rewrite attempt")
        model = genai.GenerativeModel(Config.MODEL_NAME)
        rewrite_prompt = f"""
Geçmiş konuşma özeti:
{history_context}

Soru:
{normalized_q}

Bu soruyu şirket içi bilgi tabanına uygun olacak şekilde yeniden yaz.
Sadece yeniden yazılmış soruyu döndür.
"""
        try:
            resp = model.generate_content(rewrite_prompt)
            rewritten = (resp.text or "").strip()
            if rewritten and rewritten.lower() != normalized_q.lower():
                docs = g.retriever.run(rewritten, k=4)
                graded = g.retriever_grader.run(rewritten, docs, min_thresh=0.05)
                normalized_q = rewritten
        except Exception as e:
            log_warning(f"[RAG] Rewrite fail: {e}")

    # Hala yoksa → WEB fallback
    if not graded:
        log_warning("[RAG] Still no docs → WEB fallback")
        web = _web_search_answer(normalized_q, history_context)
        memory.add_turn(user_query, web["answer"])
        return {
            "query": user_query,
            "source": web["source"],
            "answer": web["answer"],
            "hallucination_score": web["hallucination_score"],
            "answer_grade": web["answer_grade"],
            "docs": web["docs"],
        }

    # graded listesinde en alakalı 2 dokümanın text kısmını al
    context_chunks = [doc for doc, *_ in graded[:2]]
    context_block = " ".join(context_chunks)

    log_info("[RAG] Generating answer...")
    model = genai.GenerativeModel(Config.MODEL_NAME)
    gen_prompt = f"""
Geçmiş konuşma özeti:
{history_context}

Kurumsal bilgi bağlamı:
{context_block}

Kullanıcı sorusu:
{normalized_q}

Profesyonel, kurumsal tonda Türkçe bir yanıt ver.
Cevabı **mutlaka Markdown formatında** üret; sadece markdown içeriği döndür.
"""
    final = model.generate_content(gen_prompt)
    answer = (final.text or "").strip()

    halluc_score = g.hallucination.run(answer, context_block)
    ans_score = g.answer_grader.run(answer)

    memory.add_turn(user_query, answer)
    state.log_state(
        user_query,
        answer,
        {"hallucination": halluc_score, "grade": ans_score},
    )

    log_success("[RAG] ✅ DOMAIN")
    return {
        "query": user_query,
        "source": "chroma_db",
        "answer": answer,
        "hallucination_score": halluc_score,
        "answer_grade": ans_score,
        "docs": context_chunks,
    }


# =====================================================
# Streaming Mode (SSE)
# =====================================================

def _safe_extract_docs_text(docs: List[AnyType], limit: int = 2) -> str:
    """
    Retriever'dan dönen doküman listesini normalize eder.
    Her elemandan metin kısmını çekip birleştirir.
    Eleman yapıları:
      - str
      - (text, score)
      - (text, score, metadata)
      - {"text": "...", ...}
    """
    chunks: List[str] = []

    for item in docs[:limit]:
        if isinstance(item, str):
            chunks.append(item)
        elif isinstance(item, (list, tuple)):
            # ilk elemanı metin varsayıyoruz
            if len(item) >= 1:
                chunks.append(str(item[0]))
        elif isinstance(item, dict):
            # common pattern: {"text": "...", "score": 0.12, ...}
            if "text" in item:
                chunks.append(str(item["text"]))
            elif "page_content" in item:
                chunks.append(str(item["page_content"]))
        else:
            # fallback stringleştime
            chunks.append(str(item))

    return " ".join(chunks)

async def stream_rag(user_query: str, session_id: str) -> AsyncGenerator[str, None]:
    """
    SSE için parçalı yanıt üretir.
    Bu fonksiyon run_rag() ile aynı routing mantığını uygular:
      - GENERIC_CHAT  → saf LLM + memory
      - WEB           → Tavily + LLM
      - DOMAIN (RAG)  → ChromaDB bağlamı + LLM
    Yalnızca çok kısa, kişisel follow-up sorularında DOMAIN → GENERIC_CHAT override edilir.
    """

    memory = get_memory(session_id)

    # 1. Soru analizi / yönlendirme
    router = QueryRouterNode()
    route_info = router.classify(user_query)
    route = route_info["route"]
    normalized_q = route_info["normalized_question"]

    # 2. Geçmiş bağlam
    history_context = memory.build_context()

    # 3. Follow-up override: sadece bu koşulda DOMAIN -> GENERIC_CHAT
    # Amaç: "benim adım neydi?" gibi saf sohbet devamı sorularını gereksiz yere RAG'e göndermemek.
    if route == "DOMAIN" and _looks_like_followup(normalized_q):
        log_warning("[Router Override/STREAM] Kısa kişisel takip sorusu algılandı → GENERIC_CHAT'a force ediliyor.")
        route = "GENERIC_CHAT"

    log_info(f"[STREAM] route={route} session={session_id} → '{normalized_q}'")

    model = genai.GenerativeModel(Config.MODEL_NAME)

    # ============================================================
    # CASE 1: GENERIC_CHAT (saf sohbet / hafıza üzerinden devam)
    # ============================================================
    if route == "GENERIC_CHAT":
        prompt = f"""
Geçmiş konuşma özeti:
{history_context}

Kullanıcının yeni mesajı:
{normalized_q}

Bağlama sadık kalarak Türkçe, net ve profesyonel bir cevap ver.
"""
        # Streaming yanıt
        stream = model.generate_content(prompt, stream=True)
        full_answer_chunks: List[str] = []
        chunk_idx = 0

        log_info(f"[STREAM][GENERIC_CHAT] starting stream for session={session_id}")
        for chunk in stream:
            if chunk.text:
                chunk_idx += 1
                preview = (chunk.text[:120] + '...') if len(chunk.text) > 120 else chunk.text
                log_info(f"[STREAM CHUNK][GENERIC_CHAT] idx={chunk_idx} len={len(chunk.text)} preview={preview!r}")
                full_answer_chunks.append(chunk.text)
                log_info(f"[STREAM CHUNK][GENERIC_CHAT] sending chunk idx={chunk_idx}")
                # escape newlines so client can rehydrate chunks safely
                chunk_text = (chunk.text or "").replace("\n", "\\n")
                yield f"data: {chunk_text}\n\n"
                # küçük bir sleep ile event loop'e ve socket flush'a fırsat ver
                await asyncio.sleep(0)
                log_info(f"[STREAM CHUNK][GENERIC_CHAT] sent chunk idx={chunk_idx}")
        log_info(f"[STREAM][GENERIC_CHAT] finished stream, chunks={chunk_idx} session={session_id}")

        # full answer'i memory'e yaz
        final_answer = "".join(full_answer_chunks).strip()
        if final_answer:
            memory.add_turn(user_query, final_answer)

        # bitti bildirimi
        yield "data: [DONE]\n\n"
        return

    # ============================================================
    # CASE 2: WEB (Tavily + LLM)
    # ============================================================
    if route == "WEB":
        log_info("[STREAM][WEB] Tavily araması başlatılıyor...")
        tav = TavilySearch()
        snippets = tav.search(normalized_q) or []
        top_context = " ".join(snippets[:3])

        prompt = f"""
Geçmiş konuşma özeti:
{history_context}

Web arama sonuçları:
{top_context}

Soru:
{normalized_q}

Sadece bu bağlamı kullan. Türkçe, profesyonel, mümkün olduğunca güvenilir bir yanıt ver.
Emin olmadığın yerde açıkça "emin değilim" de.
"""
        stream = model.generate_content(prompt, stream=True)
        full_answer_chunks: List[str] = []
        chunk_idx = 0
        log_info(f"[STREAM][WEB] starting stream for session={session_id}")
        for chunk in stream:
            if chunk.text:
                chunk_idx += 1
                preview = (chunk.text[:120] + '...') if len(chunk.text) > 120 else chunk.text
                log_info(f"[STREAM CHUNK][WEB] idx={chunk_idx} len={len(chunk.text)} preview={preview!r}")
                full_answer_chunks.append(chunk.text)
                log_info(f"[STREAM CHUNK][WEB] sending chunk idx={chunk_idx}")
                chunk_text = (chunk.text or "").replace("\n", "\\n")
                yield f"data: {chunk_text}\n\n"
                await asyncio.sleep(0)
                log_info(f"[STREAM CHUNK][WEB] sent chunk idx={chunk_idx}")
        log_info(f"[STREAM][WEB] finished stream, chunks={chunk_idx} session={session_id}")

        final_answer = "".join(full_answer_chunks).strip()
        if final_answer:
            memory.add_turn(user_query, final_answer)

        yield "data: [DONE]\n\n"
        return

    # ============================================================
    # CASE 3: DOMAIN (kurumsal bilgi tabanı / ChromaDB RAG)
    # ============================================================
    # Burada gerçek RAG akışı yapılır. Yani bu RAG'i kapatmıyoruz,
    # sadece gerçekten domain tipi bir soruysa buraya gelmiş oluyoruz.
    g = RAGGraph()

    log_info("[STREAM][RAG] Doküman getiriliyor...")
    docs_raw = g.retriever.run(normalized_q, k=4)

    log_info("[STREAM][RAG] Dokümanlar puanlanıyor...")
    graded = g.retriever_grader.run(normalized_q, docs_raw, min_thresh=0.05)

    # Eğer hiçbir alakalı doküman yoksa → fallback olarak WEB'e geçebiliriz
    # çünkü bu genelde şirket içi veri yoksa ama soru halen bilgi soruyorsa olur.
    if not graded:
        log_warning("[STREAM][RAG] İlgili doküman yok. WEB fallback'e düşülüyor.")
        tav = TavilySearch()
        snippets = tav.search(normalized_q) or []
        top_context = " ".join(snippets[:3])

        prompt = f"""
Geçmiş konuşma özeti:
{history_context}

Web arama sonuçları:
{top_context}

Soru:
{normalized_q}

Türkçe, profesyonel ve güvenilir bir cevap yaz.
"""
        stream = model.generate_content(prompt, stream=True)
        full_answer_chunks: List[str] = []

        for chunk in stream:
            if chunk.text:
                full_answer_chunks.append(chunk.text)
                log_info(f"[STREAM CHUNK][RAG-fallback] sending chunk len={len(chunk.text)}")
                chunk_text = (chunk.text or "").replace("\n", "\\n")
                yield f"data: {chunk_text}\n\n"
                await asyncio.sleep(0)
                log_info(f"[STREAM CHUNK][RAG-fallback] sent chunk")

        final_answer = "".join(full_answer_chunks).strip()
        if final_answer:
            memory.add_turn(user_query, final_answer)

        yield "data: [DONE]\n\n"
        return

    # graded formatı tipik olarak [(text, score, ...), ...] veya benzeri.
    # Biz ilk iki dokümanın "text" kısmını birleştireceğiz.
    def _only_text(d: AnyType) -> str:
        # güvenli normalizasyon
        if isinstance(d, str):
            return d
        if isinstance(d, (list, tuple)):
            return str(d[0]) if len(d) >= 1 else ""
        if isinstance(d, dict):
            if "text" in d:
                return str(d["text"])
            if "page_content" in d:
                return str(d["page_content"])
        return str(d)

    top_context_chunks = [_only_text(item) for item in graded[:2]]
    rag_context_block = " ".join(top_context_chunks)

    # RAG cevabını oluşturacak prompt
    prompt = f"""
Geçmiş konuşma özeti:
{history_context}

Kurumsal bağlam (iç dokümanlar):
{rag_context_block}

Kullanıcı sorusu:
{normalized_q}

Kurumsal, profesyonel ve gerçekçi bir Türkçe yanıt üret.
Yanıtta uydurma yapma; emin değilsen açıkça belirt.
"""

    stream = model.generate_content(prompt, stream=True)
    full_answer_chunks: List[str] = []

    for chunk in stream:
        if chunk.text:
            full_answer_chunks.append(chunk.text)
            log_info(f"[STREAM CHUNK][RAG] sending chunk len={len(chunk.text)}")
            chunk_text = (chunk.text or "").replace("\n", "\\n")
            yield f"data: {chunk_text}\n\n"
            await asyncio.sleep(0)
            log_info(f"[STREAM CHUNK][RAG] sent chunk")

    final_answer = "".join(full_answer_chunks).strip()
    if final_answer:
        memory.add_turn(user_query, final_answer)

    yield "data: [DONE]\n\n"
    return
