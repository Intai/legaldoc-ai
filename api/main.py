import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import get_settings
from api.core.dependencies import init_db
from api.core.telemetry import instrument_app, setup_telemetry
from api.routes.v1.router import router as v1_router

logger = logging.getLogger(__name__)

setup_telemetry()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    await init_db()
    logger.info("Database initialised")

    from langraph.services import vector_store

    vector_store.init_collection()
    logger.info("Vector store collection initialised")
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    settings = get_settings()

    app = FastAPI(title=settings.app_title, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "traceparent",
            "tracestate",
        ],
    )

    app.include_router(v1_router, prefix="/api/v1")

    instrument_app(app)

    return app


app = create_app()
