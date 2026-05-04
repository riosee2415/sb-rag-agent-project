import json

from loguru import logger
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "SV Dev RAG Agent"
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"  # noqa: S104
    PORT: int = 8000
    # Stored as raw string; use .cors_origins_list for list[str]
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        v = self.CORS_ORIGINS.strip()
        if v.startswith("["):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(i) for i in parsed]
            except (json.JSONDecodeError, ValueError):
                pass
        return [i.strip() for i in v.split(",") if i.strip()] or ["*"]

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Auth
    API_SHARED_SECRET: str = ""

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Pinecone
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = "sv-dev-rag"

    # YouTube
    YOUTUBE_API_KEY: str = ""

    # Cohere (optional)
    COHERE_API_KEY: str = ""

    # Redis (optional)
    REDIS_URL: str = ""

    def warn_missing(self) -> None:
        required = {
            "OPENAI_API_KEY": self.OPENAI_API_KEY,
            "PINECONE_API_KEY": self.PINECONE_API_KEY,
            "YOUTUBE_API_KEY": self.YOUTUBE_API_KEY,
            "API_SHARED_SECRET": self.API_SHARED_SECRET,
            "SUPABASE_URL": self.SUPABASE_URL,
            "SUPABASE_SERVICE_KEY": self.SUPABASE_SERVICE_KEY,
            "SUPABASE_JWT_SECRET": self.SUPABASE_JWT_SECRET,
        }
        optional = {
            "COHERE_API_KEY": self.COHERE_API_KEY,
            "REDIS_URL": self.REDIS_URL,
        }
        for name, val in required.items():
            if not val:
                logger.error(f"Required env var {name} is not set — service may fail")
        for name, val in optional.items():
            if not val:
                logger.warning(f"Optional env var {name} is not set — feature degraded")


settings = Settings()
settings.warn_missing()
