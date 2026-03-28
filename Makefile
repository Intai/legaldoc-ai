-include .env
export

.PHONY: help dev dev-bg dev-stop db-seed

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
