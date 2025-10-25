from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.pipeline import run_rag, stream_rag

app = FastAPI(title="AILAYZER RAG API")

# =====================================================
# ✅ CORS Middleware - UI'dan API'ye istek için şart
# =====================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production'da domain bazlı kısıtlama yapılacak
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# ✅ JSON Request Model
# =====================================================
class QueryRequest(BaseModel):
    query: str

# =====================================================
# ✅ Standard RAG Query (Sync Response)
# =====================================================
@app.post("/rag/query")
def rag_query(req: QueryRequest):
    result = run_rag(req.query)
    return result

# =====================================================
# ✅ Streaming Endpoint (Token Token Yazdırma)
# =====================================================
@app.get("/rag/stream")
def rag_stream(q: str):
    return StreamingResponse(stream_rag(q), media_type="text/event-stream")


# =====================================================
# ✅ Health Check (UI İçin Faydalı)
# =====================================================
@app.get("/health")
def health():
    return {"status": "ok", "service": "AILAYZER RAG API"}
