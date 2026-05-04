from __future__ import annotations

import asyncio
from typing import Any

from loguru import logger
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings

_index: Any = None
_initialized: bool = False


async def init_index() -> None:
    global _index, _initialized
    if not settings.PINECONE_API_KEY:
        logger.warning("PINECONE_API_KEY not set — vector search disabled")
        return
    try:
        from pinecone import Pinecone

        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        existing = [idx.name for idx in pc.list_indexes()]
        if settings.PINECONE_INDEX_NAME not in existing:
            logger.error(
                f"Pinecone index '{settings.PINECONE_INDEX_NAME}' does not exist — "
                "vector search will return empty results"
            )
            return
        _index = pc.Index(settings.PINECONE_INDEX_NAME)
        _initialized = True
        logger.info(f"Pinecone index '{settings.PINECONE_INDEX_NAME}' connected")
    except Exception as exc:
        logger.error(f"Pinecone init failed: {exc}")


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def query_vectors(embedding: list[float], top_k: int = 10) -> list[dict[str, Any]]:
    if _index is None:
        logger.warning("Pinecone not initialized — returning empty results")
        return []
    try:
        result = await asyncio.to_thread(
            _index.query,
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
        )
        return [
            {"id": m.id, "score": m.score, "metadata": m.metadata or {}}
            for m in result.matches
        ]
    except Exception as exc:
        logger.error(f"Pinecone query_vectors failed: {exc}")
        return []


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def upsert_vectors(records: list[dict[str, Any]]) -> None:
    if _index is None:
        logger.warning("Pinecone not initialized — upsert skipped")
        return
    try:
        await asyncio.to_thread(_index.upsert, vectors=records)
    except Exception as exc:
        logger.error(f"Pinecone upsert_vectors failed: {exc}")
        raise
