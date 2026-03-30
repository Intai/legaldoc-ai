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

## Overview

- [Product design](https://github.com/Intai/legaldoc-ai/blob/main/docs/product-design.md)
- [Style guide](https://htmlpreview.github.io/?https://github.com/Intai/legaldoc-ai/blob/main/docs/style-guide.html)
- [Home page layout design](https://github.com/Intai/legaldoc-ai/blob/main/docs/documents-layout.md)
- [Document page layout design](https://github.com/Intai/legaldoc-ai/blob/main/docs/document-detail-layout.md)
- [Generate document layout design](https://github.com/Intai/legaldoc-ai/blob/main/docs/new-document-layout.md)
- [Home page story](https://github.com/Intai/legaldoc-ai/blob/main/docs/documents-story.md)
- [Document page story](https://github.com/Intai/legaldoc-ai/blob/main/docs/document-detail-story.md)
- [Generate document story](https://github.com/Intai/legaldoc-ai/blob/main/docs/new-document-story.md)
- [Home page BDD scenarios](https://github.com/Intai/legaldoc-ai/blob/main/web/src/documents/docs/documents-page.feature)
- [Document page BDD scenarios](https://github.com/Intai/legaldoc-ai/blob/main/web/src/documents/docs/document-detail.feature)
- [Generate document BDD scenarios](https://github.com/Intai/legaldoc-ai/blob/main/web/src/documents/docs/new-document.feature)
- [LangGraph workflow BDD scenarios](https://github.com/Intai/legaldoc-ai/blob/main/web/src/documents/docs/generate-document.feature)

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
