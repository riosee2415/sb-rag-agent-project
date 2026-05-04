from __future__ import annotations

import asyncio
import tempfile
from typing import Any

from loguru import logger

from app.db.queries.videos import (
    get_all_videos,
    update_video_status,
    upsert_chunks_bulk,
    upsert_video,
)
from app.services import embedding_service, pinecone_service
from app.services.chunking_service import chunk_text
from app.services.transcription_service import transcribe
from app.services.youtube_service import download_audio, get_channel_videos


async def _try_update_status(video_id: str, video_status: str) -> None:
    """Update status; re-raises CancelledError, swallows other DB errors."""
    try:
        await update_video_status(video_id, video_status)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.warning(f"Status update failed for {video_id} → {video_status}: {exc!r}")


async def ingest_channel(ctx: object) -> None:
    """ARQ task: full channel ingestion pipeline.

    Steps:
    1. Fetch all videos from YouTube channel
    2. For each new/pending video: download audio
    3. Transcribe with Whisper
    4. Chunk text
    5. Embed chunks
    6. Upsert to Pinecone
    7. Upsert to Supabase
    """

    logger.info("ingest_channel started")

    # Step 1: Fetch channel videos
    try:
        channel_videos: list[dict[str, Any]] = await get_channel_videos()
    except Exception as exc:
        logger.error(f"Failed to fetch channel videos: {exc}")
        return

    # Get existing videos to find pending ones
    try:
        existing = await get_all_videos()
        existing_map = {v.video_id: v.status for v in existing}
    except Exception as exc:
        logger.error(f"Failed to load existing videos: {exc}")
        existing_map = {}

    # Step 2: Upsert metadata and process pending
    for video in channel_videos:
        video_id = str(video.get("video_id", ""))
        title = str(video.get("title", ""))
        raw_duration = video.get("duration_sec")
        duration_sec: int | None = int(raw_duration) if raw_duration is not None else None
        raw_published = video.get("published_at")
        from datetime import datetime
        published_at: datetime | None = (
            raw_published if isinstance(raw_published, datetime) else None
        )

        if not video_id:
            continue

        is_new = video_id not in existing_map
        try:
            await upsert_video(video_id, title, duration_sec, published_at)
            if is_new:
                # upsert_video never touches status — initialise new rows to "pending"
                await update_video_status(video_id, "pending")
        except Exception as exc:
            logger.error(f"upsert_video failed for {video_id}: {exc}")
            continue

        current_status = existing_map.get(video_id, "pending")
        if current_status == "done":
            logger.debug(f"Skipping already-done video: {video_id}")
            continue

        with tempfile.TemporaryDirectory() as tmpdir:
            # Step 2: Download audio
            try:
                audio_path = await download_audio(video_id, tmpdir)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error(f"Audio download failed for {video_id}: {exc}")
                await _try_update_status(video_id, "error")
                continue

            # Step 3: Transcribe
            try:
                transcript = await transcribe(audio_path)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error(f"Transcription failed for {video_id}: {exc}")
                await _try_update_status(video_id, "error")
                continue

            text = str(transcript.get("text", ""))
            timestamps: list[dict[str, Any]] = []
            raw_words = transcript.get("words", [])
            if isinstance(raw_words, list):
                timestamps = raw_words

            if not text.strip():
                logger.warning(f"Empty transcript for {video_id}")
                await _try_update_status(video_id, "error")
                continue

            # Step 4: Chunk (CPU-intensive kss/tiktoken — off-thread to avoid blocking event loop)
            try:
                chunks = await asyncio.to_thread(chunk_text, text, timestamps)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error(f"Chunking failed for {video_id}: {exc}")
                await _try_update_status(video_id, "error")
                continue

            # Step 5: Embed
            try:
                chunk_texts = [str(c["text"]) for c in chunks]
                embeddings = await embedding_service.embed_batch(chunk_texts)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error(f"Embedding failed for {video_id}: {exc}")
                await _try_update_status(video_id, "error")
                continue

            # Step 6: Upsert to Pinecone
            try:
                records: list[dict[str, Any]] = []
                for i, (chunk, emb) in enumerate(zip(chunks, embeddings, strict=False)):
                    records.append(
                        {
                            "id": f"{video_id}_chunk_{i}",
                            "values": emb,
                            "metadata": {
                                "video_id": video_id,
                                "video_title": title,
                                "text": str(chunk["text"]),
                                "start_sec": float(chunk.get("start_sec", 0)),
                                "end_sec": float(chunk.get("end_sec", 0)),
                                "chunk_index": int(chunk.get("chunk_index", i)),
                            },
                        }
                    )
                await pinecone_service.upsert_vectors(records)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error(f"Pinecone upsert failed for {video_id}: {exc}")
                await _try_update_status(video_id, "error")
                continue

            # Step 7: Bulk upsert chunks to Supabase (single call, avoids N+1)
            try:
                await upsert_chunks_bulk(video_id=video_id, chunks=chunks)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error(f"Supabase chunk upsert failed for {video_id}: {exc}")
                await _try_update_status(video_id, "error")
                continue

            await _try_update_status(video_id, "done")
            logger.info(f"Ingestion complete for video: {video_id}")

    logger.info("ingest_channel finished")


class WorkerSettings:
    functions = [ingest_channel]
    queue_name = "arq:queue"
