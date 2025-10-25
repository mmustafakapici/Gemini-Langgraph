from pydantic import BaseModel
from typing import Optional, List
from src.pipeline import run_rag
from src.utils.logger import log_info, log_success

class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 3

class QueryResponse(BaseModel):
    query: str
    answer: str
    hallucination_score: float
    answer_grade: float
    retrieved_docs: Optional[List[str]]

class RAGRouter:
    """
    Basit bir yönlendirici. Konsol veya CLI üzerinden gelen komutları işler.
    İleride FastAPI ya da REST interface eklenmek istenirse bu sınıf genişletilebilir.
    """
    def __init__(self):
        log_info("RAG Router initialized.")

    def handle_query(self, data: QueryRequest) -> QueryResponse:
        log_info(f"Handling query: {data.query}")
        result = run_rag(data.query)
        return QueryResponse(
            query=data.query,
            answer=result["answer"],
            hallucination_score=result["hallucination_score"],
            answer_grade=result["answer_grade"],
            retrieved_docs=result["docs"]
        )

if __name__ == "__main__":
    router = RAGRouter()
    query = input("Sorgu girin: ")
    req = QueryRequest(query=query)
    resp = router.handle_query(req)
    log_success(f"Cevap: {resp.answer}")
    print(f"Hallucination Score: {resp.hallucination_score}")
    print(f"Answer Grade: {resp.answer_grade}")
