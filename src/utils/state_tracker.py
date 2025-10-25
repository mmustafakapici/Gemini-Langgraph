import json
import os
from datetime import datetime

class StateTracker:
    """
    Sistem çalışma geçmişini kaydeder (her RAG çağrısında).
    """
    def __init__(self, path="data/state.json"):
        self.path = path
        if not os.path.exists("data"):
            os.makedirs("data", exist_ok=True)

    def log_state(self, query: str, answer: str, scores: dict):
        record = {
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "answer": answer,
            "scores": scores
        }
        history = []
        if os.path.exists(self.path):
            with open(self.path, "r", encoding="utf-8") as f:
                try:
                    history = json.load(f)
                except json.JSONDecodeError:
                    history = []
        history.append(record)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
