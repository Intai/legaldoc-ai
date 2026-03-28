from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from api.core.config import get_settings
from api.models.document import DocumentModel

_client: AsyncIOMotorClient | None = None


async def init_db():
    """Initialize the MongoDB connection and Beanie ODM.

    Connects to MongoDB using motor AsyncIOMotorClient and initialises
    Beanie with the registered document models.
    """
    global _client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=_client[settings.mongodb_db_name],
        document_models=[DocumentModel],
    )


def get_database() -> AsyncIOMotorDatabase:
    """Return the active MongoDB database instance.

    Intended for use as a FastAPI dependency.

    Raises:
        RuntimeError: If the database has not been initialised via init_db.
    """
    if _client is None:
        raise RuntimeError("Database not initialised. Call init_db first.")
    settings = get_settings()
    return _client[settings.mongodb_db_name]
