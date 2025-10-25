def grade_retrieval(query: str, docs: list[str]):
    grades = []
    for doc in docs:
        overlap = len(set(query.lower().split()) & set(doc.lower().split()))
        score = overlap / max(len(query.split()), 1)
        grades.append((doc, round(score, 2)))
    return sorted(grades, key=lambda x: x[1], reverse=True)
