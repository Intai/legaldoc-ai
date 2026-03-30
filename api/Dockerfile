FROM python:3.12-slim

WORKDIR /srv

COPY --from=langraph pyproject.toml ./langraph/
COPY pyproject.toml ./api/
RUN pip install -e "./langraph" && pip install -e "./api[dev]"

COPY --from=langraph . ./langraph
COPY . ./api

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/srv/api"]
