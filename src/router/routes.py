from pydantic import BaseModel
from typing import Optional, List

from src.pipeline import run_rag
from src.utils.logger import log_info, log_success, log_warning
from src.utils.session import load_or_create_session_id


class QueryRequest(BaseModel):
    query: str
    session_id: str


class QueryResponse(BaseModel):
    query: str
    answer: str
    hallucination_score: float
    answer_grade: float
    retrieved_docs: Optional[List[str]]
    source: str  # "generic_llm" | "web_search" | "chroma_db"


class RAGRouter:
    """
    UI + CLI yönlendiricisi.
    Memory-aware RAG çağrılarını yönetir.
    """
    def __init__(self):
        log_info("[RAG Router initialized]")

    def handle_query(self, data: QueryRequest) -> QueryResponse:
        log_info(f"[Router] Handling query: {data.query}")

        if not data.session_id:
            log_warning("[Router] Session ID eksik → yenisi oluşturuluyor")
            data.session_id = load_or_create_session_id()

        result = run_rag(data.query, data.session_id)

        log_success("[Router] ✅ RAG işlemi tamam")

        return QueryResponse(
            query=data.query,
            answer=result["answer"],
            hallucination_score=result["hallucination_score"],
            answer_grade=result["answer_grade"],
            retrieved_docs=result["docs"],
            source=result["source"],
        )
