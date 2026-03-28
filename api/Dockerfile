FROM python:3.12-slim

WORKDIR /srv

COPY pyproject.toml ./api/
RUN pip install -e "./api[dev]"

COPY . ./api

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/srv/api"]
