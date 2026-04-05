-include .env
export

.PHONY: help dev dev-bg dev-stop db-seed install lint test coverage regression

_svc := $(or $(svc),api web)

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*## .*$$' Makefile | sed 's/:.*## /	/' | awk -F'\t' '{printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	docker compose up --build

dev-bg: ## Start development environment in background
	docker compose up --build -d

dev-stop: ## Stop development environment
	docker compose down

db-seed: ## Seed the database
	docker compose exec api python -m api.db.seed

reseed: db-seed ## Alias for db-seed

install: ## Install dependencies (svc=api|web, default: both)
ifneq ($(filter api,$(_svc)),)
	cd langraph && pip install -e ".[dev]"
	cd api && pip install -e ".[dev]"
endif
ifneq ($(filter web,$(_svc)),)
	cd web && npm install
endif

lint: ## Run linters (svc=api|web, default: both)
ifneq ($(filter api,$(_svc)),)
	cd api && ruff check .
	cd langraph && ruff check .
endif
ifneq ($(filter web,$(_svc)),)
	cd web && npm run lint
endif

test: ## Run tests (svc=api|web, default: both)
ifneq ($(filter api,$(_svc)),)
	cd api && pytest tests/
	cd langraph && pytest tests/
endif
ifneq ($(filter web,$(_svc)),)
	cd web && npm test
endif

coverage: ## Run tests with coverage (svc=api|web, default: both)
ifneq ($(filter api,$(_svc)),)
	cd api && pytest --cov --cov-report=term-missing --cov-report=json tests/
	cd langraph && pytest --cov --cov-report=term-missing --cov-report=json tests/
endif
ifneq ($(filter web,$(_svc)),)
	cd web && npm run test:coverage -- --coverageReporters=text --coverageReporters=json-summary
endif

regression: ## Run e2e tests (include=all to include long scenarios)
ifeq ($(include),all)
	cd web && npm run test:e2e
else
	cd web && npm run test:e2e -- --grep-invert "@timeout-"
endif
