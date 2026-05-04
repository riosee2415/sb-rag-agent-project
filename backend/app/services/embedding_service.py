from __future__ import annotations

from fastapi import HTTPException, status
from loguru import logger
from openai import AsyncOpenAI
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings

_client: AsyncOpenAI | None = None

_EMBEDDING_MODEL = "text-embedding-3-small"
_EMBEDDING_DIMS = 1536


def _get_client() -> AsyncOpenAI:
    global _client
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": "OpenAI API key not configured", "code": "SERVICE_UNAVAILABLE"},
        )
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def embed_text(text: str) -> list[float]:
    client = _get_client()
    try:
        response = await client.embeddings.create(
            model=_EMBEDDING_MODEL,
            input=text,
            dimensions=_EMBEDDING_DIMS,
        )
        return response.data[0].embedding
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"embed_text failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": f"Embedding failed: {exc}", "code": "EMBEDDING_ERROR"},
        ) from exc


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def embed_batch(texts: list[str]) -> list[list[float]]:
    client = _get_client()
    try:
        response = await client.embeddings.create(
            model=_EMBEDDING_MODEL,
            input=texts,
            dimensions=_EMBEDDING_DIMS,
        )
        return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"embed_batch failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": f"Batch embedding failed: {exc}", "code": "EMBEDDING_ERROR"},
        ) from exc
