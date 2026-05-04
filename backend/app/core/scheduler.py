from __future__ import annotations

from typing import cast

from loguru import logger


def create_scheduler() -> object | None:
    try:
        import pytz
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = AsyncIOScheduler()

        kst = pytz.timezone("Asia/Seoul")
        trigger = CronTrigger(hour=0, minute=0, second=0, timezone=kst)

        scheduler.add_job(
            _scheduled_ingest,
            trigger=trigger,
            id="daily_ingest",
            replace_existing=True,
        )
        return cast(object, scheduler)
    except ImportError as exc:
        logger.warning(f"APScheduler or pytz not installed — scheduled jobs disabled: {exc}")
        return None


async def _scheduled_ingest() -> None:
    logger.info("Scheduled ingestion triggered (KST midnight)")
    try:
        from app.workers.ingestion_worker import ingest_channel

        await ingest_channel(None)
    except Exception as exc:
        logger.error(f"Scheduled ingestion failed: {exc}")
