import os
import hashlib
import pickle
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
import chromadb
from src.annotator.document_annotator import DocumentAnnotator
from src.config import Config
from src.utils.logger import log_info, log_success, log_warning, log_error

class DocumentIngestor:
    """
    PDF/TXT dokümanlarını okuyup:
    - metni çıkarır
    - embedding üretir (cache destekli)
    - ChromaDB koleksiyonuna kalıcı olarak yazar
    """

    def __init__(
        self,
        source_dir="data/sources",
        cache_dir="data/cache",
        collection_name="rag_docs",
        chroma_path=None,
    ):
        self.source_dir = source_dir
        self.cache_dir = cache_dir
        self.collection_name = collection_name
        self.chroma_path = chroma_path or Config.CHROMA_PATH

        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs(self.chroma_path, exist_ok=True)

        # ⬇⬇⬇ BURASI KRİTİK: PersistentClient kullanıyoruz ⬇⬇⬇
        self.client = chromadb.PersistentClient(path=self.chroma_path)

        self.collection = self.client.get_or_create_collection(self.collection_name)

        self.model = SentenceTransformer(Config.EMBEDDING_MODEL)
        self.annotator = DocumentAnnotator()

        log_info("──────────────────────────────")
        log_info(f"🧠 Embedding Model   : {Config.EMBEDDING_MODEL}")
        log_info(f"💾 Chroma Path       : {os.path.abspath(self.chroma_path)}")
        log_info(f"📚 Collection Name   : {self.collection_name}")
        log_info(f"📂 Cache Directory   : {os.path.abspath(self.cache_dir)}")
        log_info("──────────────────────────────")

    def _hash_text(self, text: str):
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def _load_cache(self, hash_id: str):
        path = os.path.join(self.cache_dir, f"{hash_id}.pkl")
        if os.path.exists(path):
            with open(path, "rb") as f:
                return pickle.load(f)
        return None

    def _save_cache(self, hash_id: str, embedding):
        path = os.path.join(self.cache_dir, f"{hash_id}.pkl")
        with open(path, "wb") as f:
            pickle.dump(embedding, f)

    def _extract_text(self, file_path: str):
        if file_path.endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        elif file_path.endswith(".pdf"):
            from PyPDF2 import PdfReader
            pdf = PdfReader(file_path)
            return "".join([p.extract_text() or "" for p in pdf.pages])
        else:
            log_warning(f"{file_path} desteklenmeyen format, atlanıyor.")
            return ""

    def load_documents(self):
        files = [f for f in os.listdir(self.source_dir) if f.endswith((".txt", ".pdf"))]
        if not files:
            log_warning("Kaynak dizinde doküman bulunamadı.")
        else:
            log_info(f"{len(files)} doküman bulundu: {', '.join(files)}")
        return files

    def process_documents(self):
        files = self.load_documents()
        if not files:
            return

        log_info(f"🚀 Koleksiyona ingest başlıyor -> '{self.collection_name}'")

        for file_name in tqdm(files, desc="📄 Dokümanlar işleniyor", colour="cyan"):
            file_path = os.path.join(self.source_dir, file_name)
            text = self._extract_text(file_path)

            if not text.strip():
                log_warning(f"{file_name} boş veya okunamadı, atlandı.")
                continue

            text_hash = self._hash_text(text)
            cached_embedding = self._load_cache(text_hash)

            if cached_embedding is not None:
                embedding = cached_embedding
                log_info(f"{file_name}: cache bulundu (yeniden encode edilmedi).")
            else:
                embedding = self.model.encode([text])[0]
                self._save_cache(text_hash, embedding)
                log_info(f"{file_name}: yeni embedding üretildi ve cache'e kaydedildi.")

            try:
                self.collection.add(
                    documents=[text],
                    embeddings=[embedding.tolist()],
                    ids=[text_hash],
                    metadatas=[{
                        "source": file_name,
                        "ingested_via": "local_ingestion",
                    }]
                )

                # dokümanı anotla (basit relevance tag vs.)
                self.annotator.annotate([text], [("AI_relevance", 0.95)])

                log_success(f"✅ {file_name} -> '{self.collection_name}' koleksiyonuna kaydedildi.")

            except Exception as e:
                log_error(f"❌ {file_name} kaydedilemedi: {e}")

        # debug amaçlı koleksiyon boyutunu yazdıralım
        count = len(self.collection.get()["ids"])
        log_info(f"📊 Toplam kayıt sayısı (collection='{self.collection_name}'): {count}")

        log_success(f"💾 Kalıcı veritabanı dizini: {os.path.abspath(self.chroma_path)}")
        log_success("🏁 Ingestion tamamlandı.")


if __name__ == "__main__":
    ingestor = DocumentIngestor()
    ingestor.process_documents()
