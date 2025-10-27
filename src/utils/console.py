from src.router.routes import RAGRouter, QueryRequest
from src.utils.session import load_or_create_session_id, reset_session
from src.utils.logger import log_info, log_warning, log_success
from src.utils.formatter import pretty_answer, print_docs_info


def start_console():
    print("=== LangGraph + Gemini RAG CLI ===")
    print("Çıkmak için 'exit' yazın.")
    print("Yeni oturum için 'reset' veya 'new' yazın.\n")

    session_id = load_or_create_session_id()
    router = RAGRouter()

    log_info(f"Session ID: {session_id}")

    while True:
        user_input = input("Soru: ").strip()

        # çıkış
        if user_input.lower() == "exit":
            print("👋 Görüşmek üzere!")
            break

        # yeni session başlat
        if user_input.lower() in ("reset", "new"):
            reset_session()
            session_id = load_or_create_session_id()
            log_warning("🔄 Yeni oturum başlatıldı (session reset).")
            log_info(f"Yeni Session ID: {session_id}")
            continue

        if not user_input:
            log_warning("Boş sorgu algılandı.")
            continue

        req = QueryRequest(query=user_input, session_id=session_id)
        resp = router.handle_query(req)

        # Ana cevap paneli
        pretty_answer(
            answer=resp.answer,
            halluc_score=resp.hallucination_score,
            grade=resp.answer_grade,
            source=resp.source,
            docs_count=len(resp.retrieved_docs) if resp.retrieved_docs else 0,
        )

        # Dokümanları göster (RAG ise)
        print_docs_info(resp.retrieved_docs)

        log_success("✅ Sorgu işlendi.\n")
