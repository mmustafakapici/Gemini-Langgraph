from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import Config

def build_llm_for_memory():
    """
    Memory özetleme ve sohbet bağlamı için kullanılacak LLM.
    Bu nesne LangChain'in beklediği ChatModel arayüzünü sağlıyor.
    """
    return ChatGoogleGenerativeAI(
        model=Config.MODEL_NAME,           # ör: "gemini-pro"
        google_api_key=Config.GOOGLE_API_KEY,
        temperature=0.3,
    )
