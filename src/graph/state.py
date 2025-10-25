from pydantic import BaseModel
from typing import List, Optional, Any

class RetrievalState(BaseModel):
    query: str
    retrieved_docs: List[str] = []
    graded_docs: List[Any] = []

class GenerationState(BaseModel):
    prompt: str
    generated_answer: Optional[str] = None
    hallucination_score: Optional[float] = None
    final_grade: Optional[float] = None
