---
globs: langraph/**
---

## Testing

- `ruff check langraph/` to lint all files.
  - `ruff check "path/to/file.py"` to lint a specific file.
- `ruff format langraph/` to format all files.
  - `ruff format "path/to/file.py"` to format a specific file.
- `pytest langraph/tests/ --cov --cov-config=langraph/pyproject.toml --cov-report=term-missing` to run all unit tests with coverage.
  - `pytest "langraph/tests/test_file.py" -k "matching_string"` to run specific unit tests in a test file.

## Convention

- Our own file names are in snake case.
- Name test files with `test_*.py` in `tests` folder.
- Write docstrings for exported functions in utils, API endpoints, and db queries.
