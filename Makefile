# ==========================================
# Base Local Development Commands
# ==========================================
setup:
	pip install -r requirements.txt

run-backend:
	uvicorn src.api.app:app --reload --port 8000

run-console:
	python -m src.main

run-ui:
	cd ui && npm install && npm run dev

ingest:
	python -m src.ingestion.ingest_documents

clean-chroma:
	rm -rf data/chroma_db/*
	rm -rf data/cache/*

inspect:
	ls -l data/chroma_db


# ==========================================
# Docker: Full Stack Commands
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


# ==========================================
# Docker: Interactive & Debug
# ==========================================
docker-bash-backend:
	docker exec -it rag-backend bash

docker-bash-ui:
	docker exec -it rag-ui sh


# ==========================================
# Docker: Data Operations
# ==========================================
docker-ingest:
	docker exec -it rag-backend python -m src.ingestion.ingest_documents

docker-inspect:
	docker exec -it rag-backend ls -l /app/data/chroma_db

# ==========================================
# Logging & Monitoring
# ==========================================

# Full stack docker logs (backend + ui)
logs:
	docker compose logs -f

# Only backend logs (RAG Engine / FastAPI)
logs-backend:
	docker compose logs backend -f

# Only UI logs (Vite / React)
logs-ui:
	docker compose logs ui -f

# Backend logs filtered by route decisions
logs-route:
	docker compose logs backend -f | grep -i route

# Hallucination evaluator logs
logs-hall:
	docker compose logs backend -f | grep -i hallucination

# Retriever activity logs
logs-retriever:
	docker compose logs backend -f | grep -i retrieving

# Web search logs (Tavily)
logs-web:
	docker compose logs backend -f | grep -i tavily

# Answer generation logs (Gemini)
logs-llm:
	docker compose logs backend -f | grep -i generating
