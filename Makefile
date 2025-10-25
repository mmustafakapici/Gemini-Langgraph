# ==========================================
# Base Commands
# ==========================================
setup:
	pip install -r requirements.txt

run:
	python -m src.main

ingest:
	python -m src.ingestion.ingest_documents

clean-chroma:
	rm -rf data/chroma_db/*
	rm -rf data/cache/*

inspect:
	ls -l data/chroma_db

# ==========================================
# Docker Commands
# ==========================================
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down


docker-restart:
	docker compose down && docker compose up -d

docker-rebuild:
	docker compose down
	docker compose build --no-cache
	docker compose up -d

docker-logs:
	docker compose logs -f

docker-bash:
	docker exec -it rag-gemini-langgraph bash

# === Inside Docker: Ingestion & Inspection ===
docker-ingest:
	docker exec -it rag-gemini-langgraph python -m src.ingestion.ingest_documents

docker-inspect:
	docker exec -it rag-gemini-langgraph ls -l /app/data/chroma_db



