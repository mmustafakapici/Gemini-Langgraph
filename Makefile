# ============================================================================
# AILAYZER RAG + LangGraph + Gemini Makefile
# ============================================================================

.DEFAULT_GOAL := help

# Helpers
HELP_SPACING := 25

define PRINT_HELP_Padded
  @printf "  \033[36m%-$(HELP_SPACING)s\033[0m %s\n" "$(1)" "$(2)"
endef


help:
	@echo ""
	@echo "📌 Available Commands:"
	@echo "-------------------------------------------------------------"
	@echo "setup                - Install Python deps for local dev"
	@echo "run-backend          - Run FastAPI backend locally"
	@echo "run-ui               - Run React UI locally"
	@echo "run-console          - Run CLI RAG interface"
	@echo "ingest               - Ingest PDFs into Chroma DB"
	@echo "clean-chroma         - Remove Chroma DB data"
	@echo "inspect              - Inspect Chroma DB folder"
	@echo "-------------------------------------------------------------"
	@echo "docker-build         - Build full stack images"
	@echo "docker-up            - Start full stack services"
	@echo "docker-down          - Stop & remove services"
	@echo "docker-restart       - Restart stack containers"
	@echo "docker-rebuild       - Rebuild and restart"
	@echo "docker-logs          - Logs full stack"
	@echo "docker-bash-backend  - Access backend container shell"
	@echo "docker-bash-ui       - Access UI container shell"
	@echo "docker-ingest        - Ingest data inside docker"
	@echo "docker-inspect       - View Chroma data in container"
	@echo "-------------------------------------------------------------"
	@echo "backend-up           - Start backend only"
	@echo "backend-down         - Stop backend only"
	@echo "backend-restart      - Restart backend only"
	@echo "ui-up                - Start UI only"
	@echo "ui-down              - Stop UI only"
	@echo "ui-restart           - Restart UI only"
	@echo "-------------------------------------------------------------"
	@echo "logs                 - All logs (follow)"
	@echo "logs-backend         - Backend logs"
	@echo "logs-ui              - UI logs"
	@echo "logs-route           - Route decision logs"
	@echo "logs-hall            - Hallucination logs"
	@echo "logs-retriever       - Retriever logs"
	@echo "logs-web             - Tavily logs"
	@echo "logs-llm             - LLM generation logs"
	@echo ""

# ============================================================================
# Local Development
# ============================================================================

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
	rm -rf data/chroma_db/* data/cache/*

inspect:
	ls -l data/chroma_db


# ============================================================================
# Docker Full-Stack Ops
# ============================================================================

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


# ============================================================================
# Docker Debug
# ============================================================================

docker-bash-backend:
	docker exec -it rag-backend bash

docker-bash-ui:
	docker exec -it rag-ui sh


# ============================================================================
# Docker Data Ops
# ============================================================================

docker-ingest:
	docker exec -it rag-backend python -m src.ingestion.ingest_documents

docker-inspect:
	docker exec -it rag-backend ls -l /app/data/chroma_db


# ============================================================================
# Service Level Control
# ============================================================================

backend-up:
	docker compose up -d rag-backend

backend-down:
	docker compose stop rag-backend && docker compose rm -f rag-backend

backend-restart:
	make backend-down && make backend-up

ui-up:
	docker compose up -d rag-ui

ui-down:
	docker compose stop rag-ui && docker compose rm -f rag-ui

ui-restart:
	make ui-down && make ui-up


# ============================================================================
# Logging / Monitoring Filters
# ============================================================================

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f rag-backend

logs-ui:
	docker compose logs -f rag-ui

logs-route:
	docker compose logs -f rag-backend | grep -i route

logs-hall:
	docker compose logs -f rag-backend | grep -i hallucination

logs-retriever:
	docker compose logs -f rag-backend | grep -i retrieving

logs-web:
	docker compose logs -f rag-backend | grep -i tavily

logs-llm:
	docker compose logs -f rag-backend | grep -i generating
