from __future__ import annotations

import os
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient

# Set mock env vars before importing app
os.environ.setdefault("OPENAI_API_KEY", "sk-test-mock")
os.environ.setdefault("PINECONE_API_KEY", "test-pinecone-key")
os.environ.setdefault("PINECONE_INDEX_NAME", "test-index")
os.environ.setdefault("YOUTUBE_API_KEY", "test-youtube-key")
os.environ.setdefault("API_SHARED_SECRET", "test-secret-12345")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-32chars-minimum!!")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("COHERE_API_KEY", "")
os.environ.setdefault("REDIS_URL", "")
os.environ.setdefault("ENVIRONMENT", "test")


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def api_secret_headers() -> dict[str, str]:
    return {"X-API-Secret": "test-secret-12345"}


@pytest.fixture
def valid_jwt() -> str:
    """Generate a valid test JWT signed with the test secret."""
    from jose import jwt

    payload = {"sub": "test-user-id-123", "email": "test@example.com"}
    return jwt.encode(
        payload,
        "test-jwt-secret-32chars-minimum!!",
        algorithm="HS256",
    )


@pytest.fixture
def auth_headers(api_secret_headers: dict[str, str], valid_jwt: str) -> dict[str, str]:
    return {**api_secret_headers, "Authorization": f"Bearer {valid_jwt}"}
