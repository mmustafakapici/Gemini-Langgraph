import os

class DocumentLoader:
    def __init__(self, path="data/sources"):
        self.path = path

    def load_texts(self):
        docs = []
        for file in os.listdir(self.path):
            if file.endswith(".txt"):
                with open(os.path.join(self.path, file), "r", encoding="utf-8") as f:
                    docs.append(f.read())
        return docs
