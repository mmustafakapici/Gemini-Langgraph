# src/retriever/vectorstore.py
import chromadb
from src.config import Config
from src.retriever.embeddings import EmbeddingModel
from src.utils.logger import log_info


class VectorStore:
    def __init__(self, collection_name: str = "rag_docs"):
        self.collection_name = collection_name
        self.client = chromadb.PersistentClient(
            path=Config.CHROMA_PATH
        )

        self.collection = self.client.get_or_create_collection(self.collection_name)
        self.embedding_model = EmbeddingModel(Config.EMBEDDING_MODEL)

        log_info(f"[VectorStore] Chroma path   : {Config.CHROMA_PATH}")
        log_info(f"[VectorStore] Collection    : {self.collection_name}")

    def add_documents(self, docs):
        embeddings = self.embedding_model.encode(docs)
        ids = [f"doc_{i}" for i in range(len(docs))]
        self.collection.add(
            documents=docs,
            embeddings=[e.tolist() for e in embeddings],
            ids=ids,
        )

    def query(self, query: str, n: int = 3):
        query_vec = self.embedding_model.encode([query])[0]
        results = self.collection.query(
            query_embeddings=[query_vec],
            n_results=n,
        )
        return results.get("documents", [[]])[0]
