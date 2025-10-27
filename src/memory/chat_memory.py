from langchain.memory import ConversationSummaryBufferMemory
from langchain.schema import HumanMessage, AIMessage
from typing import List, Dict, Any

from src.memory.llm_provider import build_llm_for_memory


class ChatMemoryManager:
    """
    Session bazlı konuşma hafızası.
    - ConversationSummaryBufferMemory: uzun geçmişi özetler, son mesajları ham saklar.
    - build_context(): LLM'e promotta enjekte edeceğimiz "geçmiş konuşma özeti"ni döndürür.
    """

    def __init__(self, max_token_limit: int = 1000):
        self.llm = build_llm_for_memory()
        self.memory = ConversationSummaryBufferMemory(
            llm=self.llm,
            max_token_limit=max_token_limit,
            return_messages=True,  # history'yi structured şekilde döndürsün
        )

    def add_turn(self, user_msg: str, ai_msg: str) -> None:
        """
        Bir soru-cevap turu tamamlandıktan sonra hafızaya yaz.
        """
        self.memory.chat_memory.add_user_message(user_msg)
        self.memory.chat_memory.add_ai_message(ai_msg)

    def build_context(self) -> str:
        """
        LLM'e aktarılacak geçmiş bağlamı string olarak üret.
        Bu metin geçmiş diyalogların özetini ve yakın tur mesajlarını içerir.
        """
        vars = self.memory.load_memory_variables({})
        # load_memory_variables() tipik olarak {"history": "..."} döndürür.
        return vars.get("history", "")

    def export_messages(self) -> List[Dict[str, Any]]:
        """
        UI tarafında oturum penceresini göstermek istersek kullanırız.
        (Debug / izleme için.)
        """
        msgs = []
        for m in self.memory.chat_memory.messages:
            if isinstance(m, HumanMessage):
                msgs.append({"role": "user", "content": m.content})
            elif isinstance(m, AIMessage):
                msgs.append({"role": "assistant", "content": m.content})
        return msgs
