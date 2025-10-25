from __future__ import annotations

import os
from typing import Dict, Any, List, AsyncGenerator

import google.generativeai as genai

from src.config import Config
from src.graph.graph_builder import RAGGraph
from src.graph.nodes import QueryRouterNode
from src.retriever.web_search import TavilySearch
from src.utils.logger import log_info, log_success, log_warning, log_error
from src.utils.state_tracker import StateTracker


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


def _direct_llm_answer(question: str) -> str:
    """GENERIC_CHAT için hızlı yanıt"""
    log_info("[GENERIC_CHAT] LLM answering...")
    model = genai.GenerativeModel(Config.MODEL_NAME)
    prompt = f"Kullanıcı sorusu: {question}\nTürkçe kısa ve net yanıt ver."
    resp = model.generate_content(prompt)
    return (resp.text or "").strip()


def _web_search_answer(question: str) -> Dict[str, Any]:
    """WEB Search + LLM Answer"""
    log_info("[WEB] Tavily searching...")
    tav = TavilySearch()
    snippets: List[str] = tav.search(question) or []
    top = " ".join(snippets[:3])

    model = genai.GenerativeModel(Config.MODEL_NAME)
    prompt = f"""
Web arama sonuçları:
{top}

Soru: {question}

• Sadece verilen bağlamı kullan.
• Türkçe açıklayıcı yanıt üret.
"""

    try:
        resp = model.generate_content(prompt)
        answer = (resp.text or "").strip()
    except Exception as e:
        log_error(f"[WEB] LLM error: {e}")
        answer = "Web sonuçları işlenirken bir hata oluştu."

    halluc = 0.95 if top else 0.40
    grade = 1.0 if len(answer.split()) > 25 else 0.60

    log_success("[WEB] Yanıt üretildi ✅")

    return {
        "source": "web_search",
        "answer": answer,
        "hallucination_score": round(halluc, 2),
        "answer_grade": round(grade, 2),
        "docs": snippets,
    }


# =====================================================
# ✅ Sync RAG Mode (UI normal request)
# =====================================================
def run_rag(user_query: str) -> Dict[str, Any]:
    state = StateTracker()
    router = QueryRouterNode()
    route_info = router.classify(user_query)
    route = route_info["route"]
    normalized_q = route_info["normalized_question"]

    log_info(f"[Router] route={route} question='{normalized_q}'")

    # GENERIC_CHAT
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
        log_success("[GENERIC_CHAT] ✅")
        return result

    # WEB
    if route == "WEB":
        web = _web_search_answer(normalized_q)
        result = {"query": user_query, **web}
        state.log_state(user_query, result["answer"], {
            "hallucination": result["hallucination_score"],
            "grade": result["answer_grade"],
        })
        log_success("[WEB] ✅")
        return result

    # DOMAIN → ChromaDB RAG
    g = RAGGraph()

    log_info("[RAG] Retrieving documents... 📚")
    docs = g.retriever.run(normalized_q, k=4)

    log_info("[RAG] Grading retrieved docs... 🔍")
    graded = g.retriever_grader.run(normalized_q, docs, min_thresh=0.05)

    # Zero hit → rewrite → retry
    if not graded:
        log_warning("[RAG] No docs. Attempting rewrite...")
        model = genai.GenerativeModel(Config.MODEL_NAME)
        rewrite_prompt = f"Soru: {normalized_q}\nDaha iyi bilgi retrieval için yeniden yaz:"
        try:
            resp = model.generate_content(rewrite_prompt)
            rewritten = (resp.text or "").strip()
            if rewritten.lower() != normalized_q.lower():
                docs = g.retriever.run(rewritten, k=4)
                graded = g.retriever_grader.run(rewritten, docs, min_thresh=0.05)
                normalized_q = rewritten
        except Exception as e:
            log_error(f"[RAG] Rewrite error: {e}")

    # Hâlâ yoksa → fallback WEB
    if not graded:
        log_warning("[RAG] Still no docs → WEB fallback 🔄")
        return _web_search_answer(normalized_q)

    context = " ".join([doc for doc, _ in graded[:2]])

    log_info("[RAG] Generating answer ✨")
    answer = g.generator.run(normalized_q, context)

    log_info("[RAG] Evaluating hallucination 🧠")
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
    log_success("[RAG] ✅ Tamamlandı (DOMAIN)")
    return result


# =====================================================
# ✅ Streaming Mode (Real-time UI)
# =====================================================
async def stream_rag(user_query: str) -> AsyncGenerator[str, None]:
    log_info("[STREAM] Başladı 🚀")

    router = QueryRouterNode()
    route_info = router.classify(user_query)
    route = route_info["route"]
    normalized_q = route_info["normalized_question"]

    model = genai.GenerativeModel(Config.MODEL_NAME)

    if route == "GENERIC_CHAT":
        prompt = normalized_q
        stream = model.generate_content(prompt, stream=True)
        for chunk in stream:
            if chunk.text:
                yield f"data: {chunk.text}\n\n"
        return

    # DOMAIN & WEB → RAG context + streaming
    g = RAGGraph()
    docs = g.retriever.run(normalized_q, k=3)
    context = " ".join([d for d, _ in docs[:2]]) if docs else ""

    prompt = f"Kontekst: {context}\n\nSoru: {normalized_q}\nTürkçe yanıt ver:"
    stream = model.generate_content(prompt, stream=True)

    for chunk in stream:
        if chunk.text:
            yield f"data: {chunk.text}\n\n"

    log_success("[STREAM] Tamam ✅")
