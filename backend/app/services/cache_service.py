from __future__ import annotations

import redis.asyncio as aioredis
from loguru import logger

from app.core.config import settings

_redis_client: aioredis.Redis | None = None
_redis_available: bool = False


async def _get_redis() -> aioredis.Redis | None:
    global _redis_client, _redis_available
    if _redis_client is not None:
        return _redis_client
    if not settings.REDIS_URL:
        return None
    try:
        client: aioredis.Redis = aioredis.from_url(  # type: ignore[no-untyped-call]
            settings.REDIS_URL, decode_responses=True
        )
        await client.ping()
        _redis_client = client
        _redis_available = True
        logger.info("Redis connection established")
        return _redis_client
    except Exception as exc:
        logger.warning(f"Redis unavailable — cache disabled: {exc}")
        _redis_available = False
        return None


async def get_cached(key: str) -> str | None:
    client = await _get_redis()
    if client is None:
        return None
    try:
        value: str | None = await client.get(key)
        return value
    except Exception as exc:
        logger.warning(f"Redis get failed: {exc}")
        return None


async def set_cached(key: str, value: str, ttl: int = 3600) -> None:
    client = await _get_redis()
    if client is None:
        return
    try:
        await client.setex(key, ttl, value)
    except Exception as exc:
        logger.warning(f"Redis set failed: {exc}")


async def invalidate_all() -> None:
    client = await _get_redis()
    if client is None:
        return
    try:
        await client.flushdb()
    except Exception as exc:
        logger.warning(f"Redis flushdb failed: {exc}")


def make_cache_key(query: str) -> str:
    import hashlib

    normalized = query.strip().lower()
    return f"chat:{hashlib.sha256(normalized.encode()).hexdigest()}"
