def grade_answer(answer: str):
    score = min(1.0, len(answer.split()) / 100)
    return round(score, 2)
