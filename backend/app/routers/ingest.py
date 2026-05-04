from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from loguru import logger
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.dependencies import verify_api_secret
from app.db.queries.videos import get_video_status_counts
from app.schemas.api import IngestResponse, StatusResponse

router = APIRouter(prefix="/api/v1", dependencies=[Depends(verify_api_secret)])
_limiter = Limiter(key_func=get_remote_address)

# In-memory flag to prevent duplicate ingestion runs
_ingestion_running: bool = False


async def _run_ingestion() -> None:
    global _ingestion_running
    try:
        from app.workers.ingestion_worker import ingest_channel

        await ingest_channel(None)
    except asyncio.CancelledError:
        logger.info("Ingestion task cancelled (server shutdown)")
        # BackgroundTask has no cancellation protocol — swallow to avoid ASGI error log
    except Exception as exc:
        logger.error(f"Background ingestion failed: {exc}")
    finally:
        _ingestion_running = False


@router.post("/ingest", response_model=IngestResponse, status_code=200)
@_limiter.limit("5/minute")
async def trigger_ingest(request: Request, background_tasks: BackgroundTasks) -> IngestResponse:
    global _ingestion_running

    # Try ARQ first
    try:
        import arq

        from app.core.config import settings

        if settings.REDIS_URL:
            pool = await arq.create_pool(arq.connections.RedisSettings.from_dsn(settings.REDIS_URL))
            job = await pool.enqueue_job("ingest_channel")
            await pool.aclose()
            job_id = str(getattr(job, "job_id", uuid.uuid4()))
            return IngestResponse(job_id=job_id, status="queued")
    except Exception as exc:
        logger.warning(f"ARQ not available, using BackgroundTasks fallback: {exc}")

    # BackgroundTasks fallback with duplicate prevention
    if _ingestion_running:
        return IngestResponse(job_id="duplicate", status="already_running")

    job_id = str(uuid.uuid4())
    _ingestion_running = True
    background_tasks.add_task(_run_ingestion)
    return IngestResponse(job_id=job_id, status="started")


@router.post("/status", response_model=StatusResponse, status_code=200)
async def ingest_status() -> StatusResponse:
    return await get_video_status_counts()
