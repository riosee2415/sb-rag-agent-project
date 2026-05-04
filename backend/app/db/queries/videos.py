from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

from loguru import logger

from app.db.client import get_supabase
from app.schemas.api import StatusResponse, VideoItem


async def get_all_videos() -> list[VideoItem]:
    client = await get_supabase()
    try:
        result = await client.table("videos").select("*").execute()
        rows: list[dict[str, Any]] = cast(list[dict[str, Any]], result.data or [])
        return [
            VideoItem(
                video_id=str(row["video_id"]),
                title=str(row["title"]),
                duration_sec=(
                    int(row["duration_sec"]) if row.get("duration_sec") is not None else None
                ),
                published_at=(
                    datetime.fromisoformat(str(row["published_at"]))
                    if row.get("published_at")
                    else None
                ),
                status=str(row.get("status", "pending")),
            )
            for row in rows
        ]
    except Exception as exc:
        logger.error(f"get_all_videos failed: {exc}")
        raise


async def get_video_status_counts() -> StatusResponse:
    client = await get_supabase()
    try:
        result = await client.table("videos").select("status").execute()
        rows: list[dict[str, Any]] = cast(list[dict[str, Any]], result.data or [])
        done = sum(1 for r in rows if r.get("status") == "done")
        pending = sum(1 for r in rows if r.get("status") == "pending")
        error = sum(1 for r in rows if r.get("status") == "error")
        return StatusResponse(
            total_videos=len(rows),
            done=done,
            pending=pending,
            error=error,
            last_updated=datetime.now(tz=UTC),
        )
    except Exception as exc:
        logger.error(f"get_video_status_counts failed: {exc}")
        raise


async def upsert_video(
    video_id: str,
    title: str,
    duration_sec: int | None,
    published_at: datetime | None,
) -> None:
    """Upsert video metadata without touching status.

    Status is intentionally excluded so existing done/error states are never overwritten.
    Callers must initialise status for brand-new rows via update_video_status().
    """
    client = await get_supabase()
    try:
        data: dict[str, Any] = {
            "video_id": video_id,
            "title": title,
        }
        if duration_sec is not None:
            data["duration_sec"] = duration_sec
        if published_at is not None:
            data["published_at"] = published_at.isoformat()
        await client.table("videos").upsert(data, on_conflict="video_id").execute()
    except Exception as exc:
        logger.error(f"upsert_video failed for {video_id}: {exc}")
        raise


async def update_video_status(video_id: str, status: str) -> None:
    client = await get_supabase()
    try:
        await (
            client.table("videos")
            .update({"status": status})
            .eq("video_id", video_id)
            .execute()
        )
    except Exception as exc:
        logger.error(f"update_video_status failed for {video_id}: {exc}")
        raise


async def upsert_chunk(
    video_id: str,
    chunk_index: int,
    text: str,
    start_sec: float,
    end_sec: float,
) -> None:
    client = await get_supabase()
    try:
        data: dict[str, Any] = {
            "video_id": video_id,
            "chunk_index": chunk_index,
            "text": text,
            "start_sec": start_sec,
            "end_sec": end_sec,
        }
        await (
            client.table("chunks")
            .upsert(data, on_conflict="video_id,chunk_index")
            .execute()
        )
    except Exception as exc:
        logger.error(f"upsert_chunk failed for {video_id} index {chunk_index}: {exc}")
        raise


async def upsert_chunks_bulk(
    video_id: str,
    chunks: list[dict[str, Any]],
) -> None:
    if not chunks:
        return
    client = await get_supabase()
    try:
        rows: list[dict[str, Any]] = [
            {
                "video_id": video_id,
                "chunk_index": int(c.get("chunk_index", i)),
                "text": str(c["text"]),
                "start_sec": float(c.get("start_sec", 0)),
                "end_sec": float(c.get("end_sec", 0)),
            }
            for i, c in enumerate(chunks)
        ]
        await (
            client.table("chunks")
            .upsert(rows, on_conflict="video_id,chunk_index")
            .execute()
        )
    except Exception as exc:
        logger.error(f"upsert_chunks_bulk failed for {video_id}: {exc}")
        raise
