from typing import Dict
from src.memory.chat_memory import ChatMemoryManager

# Basit global store. Prod'da Redis gibi bir KV store'a taşınabilir.
SESSION_MEMORIES: Dict[str, ChatMemoryManager] = {}


def get_memory(session_id: str) -> ChatMemoryManager:
    """
    Aynı session_id için her çağrıda aynı memory nesnesini döndürür.
    Yoksa oluşturur.
    """
    if session_id not in SESSION_MEMORIES:
        SESSION_MEMORIES[session_id] = ChatMemoryManager(
            max_token_limit=1000
        )
    return SESSION_MEMORIES[session_id]
