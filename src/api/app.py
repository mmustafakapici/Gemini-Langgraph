from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.pipeline import run_rag, stream_rag
from src.utils.logger import log_info, log_warning, log_error


# =====================================================
# FastAPI init + CORS
# =====================================================

app = FastAPI(
    title="AILAYZER RAG API",
    description="LangGraph + Gemini RAG servis katmanı",
    version="1.0.0",
)

# Geliştirme aşamasında her origin'e izin verebiliriz.
# Prod ortamda allow_origins'i sıkılaştırman gerekir.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # TODO: prod'da sabitle
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# Pydantic Modelleri
# =====================================================

class QueryRequest(BaseModel):
    query: str
    session_id: str  # UI, localStorage vb. üzerinden gönderiyor


class RAGResponse(BaseModel):
    query: str
    answer: str
    hallucination_score: float
    answer_grade: float
    source: str                  # "generic_llm" | "web_search" | "chroma_db"
    docs: list[str] | None = []  # retrieval context (isteğe bağlı UI gösterimi)


# =====================================================
# /rag/query   (sync JSON endpoint)
# =====================================================

@app.post("/rag/query", response_model=RAGResponse)
def rag_query(req: QueryRequest):
    """
    Senkron RAG cevabı.
    Bu uç tek seferde tam cevabı döner.
    """
    log_info(f"[API] /rag/query hit. session={req.session_id} q='{req.query}'")

    if not req.session_id:
        # session_id zorunlu, çünkü memory session_id'ye bağlı
        log_warning("[API] session_id eksik")
        return JSONResponse(
            status_code=400,
            content={"error": "session_id zorunludur."},
        )

    result = run_rag(req.query, req.session_id)

    # result dict -> RAGResponse model
    resp = RAGResponse(
        query=result["query"],
        answer=result["answer"],
        hallucination_score=result["hallucination_score"],
        answer_grade=result["answer_grade"],
        source=result["source"],
        docs=result["docs"],
    )

    return resp


# =====================================================
# /rag/stream   (SSE streaming endpoint)
# =====================================================

@app.post("/rag/stream")
async def rag_stream(req: QueryRequest):
    """
    Streaming (Server-Sent Events) cevabı.
    Frontend bu endpoint'e fetch ile bağlanır ve gelen chunk'ları canlı gösterir.

    Response Content-Type: text/event-stream
    Data formatı: "data: <parça>\n\n"
    """

    log_info(f"[API] /rag/stream hit. session={req.session_id} q='{req.query}'")

    if not req.session_id:
        log_warning("[API] session_id eksik (stream)")
        return JSONResponse(
            status_code=400,
            content={"error": "session_id zorunludur."},
        )

    async def event_generator():
        try:
            # İlk başta client'a hemen bir START event'i gönderiyoruz
            # böylece istemci stream'in başladığını anında görebilir.
            yield "data: [STREAM_STARTED]\n\n"
            async for chunk in stream_rag(req.query, req.session_id):
                # chunk zaten "data: ...\n\n" formatında dönüyor
                yield chunk
            # SSE standardı gereği kapanış için [DONE] gönderebiliriz.
            yield "data: [DONE]\n\n"
        except Exception as e:
            log_error(f"[API] stream error: {e}")
            # Hata durumunda da event-stream üzerinden hata yay
            yield f"data: [ERROR] {str(e)}\n\n"

    # StreamingResponse ile chunked SSE yanıtı veriyoruz
    # Cache-Control ve X-Accel-Buffering header'ları bazı proxylerin
    # cevap bufferlamasını engellemeye yardımcı olur.
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
