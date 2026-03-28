LegalDoc AI streamlines legal document creation. Select one or more reference documents, provide your questions or specific context, and the system generates a tailored legal document — ready to review, and save.

## Tech Stack

### Frontend

- `ESLint` for code linting and formatting.
- `React`, `shadcn/ui`, `Tailwind CSS`, `Zustand`, `React Compiler` for UI development.
- `Ramda` for functional programming.
- `RxJS` for interactive functional programming.
- `i18next` for localisation.
- `date-fns` and `date-fns-tz` for date time manipulation.
- `Jest`, `React Testing Library` and `RxJS Marbles` for unit testing and coverage.

### Backend

- `Ruff` for Python linting and formatting.
- `FastAPI` for REST API endpoints.
- `LangGraph` for AI workflow orchestration.
- `MongoDB` and `Beanie` for document storage.
- `pytest` for unit testing and coverage.

### DevOps

- `Docker compose` for containerisation.

### QA

- `Playwright` for browser manipulation.

## Project Structure

```
legaldoc-ai/
├── web/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── shadcn/
│   │   ├── stores/
│   │   ├── utils/
│   │   └── i18n/
│   ├── package.json
│   └── eslint.config.js
├── api/
│   ├── routes/
│   │   └── v1/
│   │       ├── endpoints/
│   │       └── router.py
│   ├── core/
│   │   ├── config.py
│   │   └── dependencies.py
│   ├── db/
│   ├── models/
│   ├── tests/
│   ├── main.py
│   └── pyproject.toml
├── langraph/          # named to avoid import conflict with langgraph package
│   ├── agents/
│   ├── app/
│   ├── models/
│   ├── nodes/
│   ├── prompts/
│   ├── tools/
│   ├── tests/
│   └── pyproject.toml
├── docker-compose.yml
├── Makefile
├── README.md
└── AGENTS.md
```

## Local Development

- `make dev` to start development environment on port 8080.
- `make dev-bg` to start development environment in background.
- `make dev-stop` to stop development environment.

## Convention

### API

- RESTful endpoints under `/api/v1/`.
- Resource naming in plural kebab-case (e.g. `/api/v1/documents`).
- Standard HTTP methods: GET (list/read), POST (create), PUT (update), DELETE (remove).
- Response format: `{ "data": ..., "error": null }` on success, `{ "data": null, "error": { "message": "...", "code": "..." } }` on failure.
- Standard HTTP status codes: 200, 201, 400, 404, 422, 500.
