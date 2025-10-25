import json
import os

class DocumentAnnotator:
    def __init__(self, output_dir="data/annotations"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def annotate(self, docs: list[str], grades: list[tuple]):
        annotations = [
            {"document": doc, "relevance": grade}
            for doc, grade in grades
        ]
        with open(os.path.join(self.output_dir, "annotations.json"), "w", encoding="utf-8") as f:
            json.dump(annotations, f, indent=2, ensure_ascii=False)
