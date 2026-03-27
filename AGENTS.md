LegalDoc AI streamlines legal document creation. Select one or more reference documents, provide your questions or specific context, and the system generates a tailored legal document — ready to review, and save.

## Tech Stack

### Frontend

- `ESLint` for code linting and formatting.
- `React`, `shadcn/ui`, `Tailwind CSS`, `Zustand` for UI development.
- `Ramda` for functional programming.
- `RxJS` for interactive functional programming.
- `i18next` for localisation.
- `date-fns` and `date-fns-tz` for date time manipulation.
- `Jest`, `React Testing Library` and `RxJS Marbles` for unit testing and coverage.

### Backend

- `Ruff` for Python linting and formatting.
- `FastAPI` for REST API endpoints.
- `LangGraph` for AI workflow orchestration.
- `MongoDB` for document storage.
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
│   ├── schemas/
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

## Testing

### Frontend

- `npm run lint` to lint all files.
  - `npm run lint -- "path/to/file.js*"` to lint a specific file.
- `npm test -- --silent` to run all unit tests.
  - `npm test -- --runTestsByPath "path/to/file.spec.js*" --testNamePattern="matching string" --silent` to run specific unit tests in a spec file.
- `npm run test:e2e` to run all Playwright tests.
  - `npm run test:e2e -- --grep "matching string"` to run specific Playwright tests.

### Backend

- `ruff check api/ langraph/` to lint all Python files.
  - `ruff check "path/to/file.py"` to lint a specific file.
- `ruff format api/ langraph/` to format all Python files.
  - `ruff format "path/to/file.py"` to format a specific file.
- `pytest api/tests/ --cov --cov-config=api/pyproject.toml --cov-report=term-missing` to run all API unit tests with coverage.
  - `pytest "api/tests/test_file.py" -k "matching_string"` to run specific API unit tests in a test file.
  - Replace `api` with `langraph` to run LangGraph unit tests.

## Convention

### Frontend

- Our own file names are in hyphenated lower case.
- Implement in JavaScript instead of TypeScript.
- Name test files with `*.spec.js*` next to the source code.
- Write JSDoc for exported functions in utils, and store actions/selectors.

### Backend

- Our own file names are in snake case.
- Name test files with `test_*.py` in `tests` folder.
- Write docstrings for exported functions in utils, API endpoints, and db queries.

### API

- RESTful endpoints under `/api/v1/`.
- Resource naming in plural kebab-case (e.g. `/api/v1/legal-documents`).
- Standard HTTP methods: GET (list/read), POST (create), PUT (update), DELETE (remove).
- Response format: `{ "data": ..., "error": null }` on success, `{ "data": null, "error": { "message": "...", "code": "..." } }` on failure.
- Standard HTTP status codes: 200, 201, 400, 404, 422, 500.
