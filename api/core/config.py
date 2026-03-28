from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_title: str = "LegalDoc AI API"
    mongodb_username: str = ""
    mongodb_password: str = ""
    mongodb_db_name: str = "legaldoc_ai"
    mongodb_host: str = "mongodb"
    mongodb_port: int = 27017

    model_config = {"env_prefix": ""}

    @property
    def mongodb_uri(self) -> str:
        """Build the MongoDB connection URI from individual components."""
        return (
            f"mongodb://{self.mongodb_username}:{self.mongodb_password}"
            f"@{self.mongodb_host}:{self.mongodb_port}"
        )

    @property
    def cors_origins(self) -> list[str]:
        """Return the list of allowed CORS origins."""
        return ["http://localhost:8080"]


@lru_cache
def get_settings() -> Settings:
    """Return a cached application settings instance."""
    return Settings()
