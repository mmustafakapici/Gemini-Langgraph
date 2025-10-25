def grade_hallucination(answer: str, sources: list[str]):
    tokens = sum([1 for s in sources if s.lower() in answer.lower()])
    return round(tokens / max(len(sources), 1), 2)
