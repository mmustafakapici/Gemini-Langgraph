import uuid
import json
import os
from typing import Optional


SESSION_FILE = "session.json"


def load_or_create_session_id() -> str:
    """
    CLI çalıştığında session_id yönetimini sağlar.
    Aynı terminal sürecinde memory devam eder.
    """
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r") as f:
                data = json.load(f)
                if "session_id" in data:
                    return data["session_id"]
        except Exception:
            pass

    # Yoksa yeni uuid oluştur
    session_id = str(uuid.uuid4())
    save_session_id(session_id)
    return session_id


def save_session_id(session_id: str):
    with open(SESSION_FILE, "w") as f:
        json.dump({"session_id": session_id}, f)


def reset_session():
    """Yeni bir hafıza/sesyon başlatmak için"""
    if os.path.exists(SESSION_FILE):
        os.remove(SESSION_FILE)
