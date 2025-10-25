from src.router.routes import RAGRouter, QueryRequest
from src.utils.logger import log_info, log_success
from src.utils.formatter import pretty_answer

def start_console():
    router = RAGRouter()
    while True:
        query = input("\nSoru: ")
        if query.lower() in ["exit", "quit"]:
            log_info("Çıkış yapılıyor...")
            break
        req = QueryRequest(query=query)
        resp = router.handle_query(req)
        log_success(f"\nSorgu işlendi: {query}")
        pretty_answer(resp.answer, resp.hallucination_score, resp.answer_grade)
