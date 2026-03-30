## Introduction

LegalDoc AI streamlines legal document creation. Select one or more reference documents, provide your questions or specific context, and the system generates a tailored legal document — ready to review, and save.

## Prerequisites

- Python 3.13
- Node 22

## Local Development

1. On Windows 11, install [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install).
2. Install [Docker Desktop](https://docs.docker.com/get-started/introduction/get-docker-desktop/).
3. Clone the Git repo. On Windows, do this within WSL2.
4. Create `.env` based on `.env.example`.
   | Variable | Description |
   |---|---|
   | `MONGODB_USERNAME` | MongoDB admin username |
   | `MONGODB_PASSWORD` | MongoDB admin password |
   | `MONGODB_DB_NAME` | MongoDB database name |
   | `VITE_API_BASE_URL` | Base URL for the REST API |
   | `LANGGRAPH_LLM_PROVIDER` | LLM provider for LangGraph (`anthropic` or `openrouter`) |
   | `ANTHROPIC_API_KEY` | API key for Anthropic |
   | `OPENROUTER_API_KEY` | API key for OpenRouter |
   | `LANGSMITH_API_KEY` | API key for LangSmith tracing |
   | `LANGSMITH_PROJECT` | LangSmith project name |
5. Create and activate a virtual environment.
   ```sh
   python3.13 -m venv .venv
   source .venv/bin/activate
   ```
6. `make dev` to start http://localhost:8080
   - `make db-seed` to seed the MongoDB database with mock data.
   - `make install` to install dependencies.
   - `make lint` to run linters.
   - `make test` to run unit tests.
   - `make coverage` to calculate unit test coverage.
   - `make regression` to run BDD scenarios headlessly.

## Technical Overview

```
┌──────────────────────────────────────────────────────────┐
│                       Docker Compose                     │
│                                                          │
│  ┌────────────┐      ┌───────────────┐      ┌─────────┐  │
│  │ Web (Vite) │      │ API (FastAPI) │      │ MongoDB │  │
│  │ :8080      │─────▶│ :8000         │─────▶│ :27017  │  │
│  └────────────┘      └───────┬───────┘      └─────────┘  │
│                              │                           │
│      ┌───────────────────────▼──────────────────────┐    │
│      │ LangGraph                                    │    │
│      │ analyze ──▶ structure ──▶ draft ──▶ finalize │    │
│      └───────────────────────┬──────────────────────┘    │
│                              │                           │
└──────────────────────────────┼───────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Claude / OpenRouter │
                    └─────────────────────┘
```
