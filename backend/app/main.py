from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.dependencies import load_jwks
from app.core.scheduler import create_scheduler
from app.routers import chat, conversations, ingest
from app.services.pinecone_service import init_index

limiter = Limiter(key_func=get_remote_address)

# File sink: development only — cloud deployments use stdout (ephemeral filesystem)
if settings.ENVIRONMENT != "production":
    import os
    os.makedirs("logs", exist_ok=True)
    logger.add(
        "logs/app.log",
        rotation="50 MB",
        retention=3,
        level="DEBUG",
        enqueue=True,
        backtrace=True,
        diagnose=True,
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    settings.warn_missing()
    await load_jwks()
    await init_index()

    scheduler = create_scheduler()
    if scheduler is not None:
        scheduler.start()  # type: ignore[attr-defined]
        logger.info("APScheduler started")

    # Test Redis connection (non-fatal)
    if settings.REDIS_URL:
        try:
            import redis.asyncio as aioredis

            r: aioredis.Redis = aioredis.from_url(  # type: ignore[no-untyped-call]
                settings.REDIS_URL, decode_responses=True
            )
            await r.ping()
            await r.aclose()
            logger.info("Redis connection OK")
        except Exception as exc:
            logger.warning(f"Redis connection test failed — cache disabled: {exc}")

    yield

    # Shutdown
    if scheduler is not None:
        scheduler.shutdown()  # type: ignore[attr-defined]
        logger.info("APScheduler stopped")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Secret"],
)

# Routers
app.include_router(chat.router)
app.include_router(ingest.router)
app.include_router(conversations.router)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
