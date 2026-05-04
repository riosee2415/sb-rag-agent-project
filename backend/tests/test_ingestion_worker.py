from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, patch

# ---------------------------------------------------------------------------
# ingest_channel
# ---------------------------------------------------------------------------


async def test_ingest_channel_returns_early_on_channel_fetch_error() -> None:
    from app.workers.ingestion_worker import ingest_channel

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(side_effect=Exception("api error"))),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[])),
    ):
        # Should not raise, just return
        await ingest_channel(ctx=None)


async def test_ingest_channel_skips_done_videos() -> None:
    from app.schemas.api import VideoItem
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = [
        {"video_id": "vid1", "title": "Test", "duration_sec": 60, "published_at": None}
    ]

    existing_video = VideoItem(
        video_id="vid1",
        title="Test",
        duration_sec=60,
        published_at=None,
        status="done",
    )

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[existing_video])),
        patch("app.workers.ingestion_worker.upsert_video", new=AsyncMock()),
        patch("app.workers.ingestion_worker.download_audio", new=AsyncMock()) as mock_download,
    ):
        await ingest_channel(ctx=None)
        # download_audio should NOT be called for already-done video
        mock_download.assert_not_called()


async def test_ingest_channel_handles_download_failure() -> None:
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = [
        {"video_id": "vid1", "title": "Test", "duration_sec": 60, "published_at": None}
    ]

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[])),
        patch("app.workers.ingestion_worker.upsert_video", new=AsyncMock()),
        patch("app.workers.ingestion_worker.download_audio", new=AsyncMock(side_effect=Exception("no yt-dlp"))),
        patch("app.workers.ingestion_worker.update_video_status", new=AsyncMock()) as mock_status,
    ):
        await ingest_channel(ctx=None)
        mock_status.assert_called_with("vid1", "error")


async def test_ingest_channel_handles_transcription_failure() -> None:
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = [
        {"video_id": "vid1", "title": "Test", "duration_sec": 60, "published_at": None}
    ]

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[])),
        patch("app.workers.ingestion_worker.upsert_video", new=AsyncMock()),
        patch("app.workers.ingestion_worker.download_audio", new=AsyncMock(return_value="/tmp/vid1.mp3")),
        patch("app.workers.ingestion_worker.transcribe", new=AsyncMock(side_effect=Exception("whisper error"))),
        patch("app.workers.ingestion_worker.update_video_status", new=AsyncMock()) as mock_status,
    ):
        await ingest_channel(ctx=None)
        mock_status.assert_called_with("vid1", "error")


async def test_ingest_channel_handles_empty_transcript() -> None:
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = [
        {"video_id": "vid1", "title": "Test", "duration_sec": 60, "published_at": None}
    ]

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[])),
        patch("app.workers.ingestion_worker.upsert_video", new=AsyncMock()),
        patch("app.workers.ingestion_worker.download_audio", new=AsyncMock(return_value="/tmp/vid1.mp3")),
        patch("app.workers.ingestion_worker.transcribe", new=AsyncMock(return_value={"text": "   ", "words": []})),
        patch("app.workers.ingestion_worker.update_video_status", new=AsyncMock()) as mock_status,
    ):
        await ingest_channel(ctx=None)
        mock_status.assert_called_with("vid1", "error")


async def test_ingest_channel_handles_embedding_failure() -> None:
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = [
        {"video_id": "vid1", "title": "Test", "duration_sec": 60, "published_at": None}
    ]
    transcript = {"text": "Hello world. This is a test sentence.", "words": []}
    chunks = [{"text": "Hello world.", "start_sec": 0.0, "end_sec": 5.0, "chunk_index": 0}]

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[])),
        patch("app.workers.ingestion_worker.upsert_video", new=AsyncMock()),
        patch("app.workers.ingestion_worker.download_audio", new=AsyncMock(return_value="/tmp/vid1.mp3")),
        patch("app.workers.ingestion_worker.transcribe", new=AsyncMock(return_value=transcript)),
        patch("app.workers.ingestion_worker.chunk_text", return_value=chunks),
        patch("app.workers.ingestion_worker.embedding_service") as mock_emb,
        patch("app.workers.ingestion_worker.update_video_status", new=AsyncMock()) as mock_status,
    ):
        mock_emb.embed_batch = AsyncMock(side_effect=Exception("openai error"))
        await ingest_channel(ctx=None)
        mock_status.assert_called_with("vid1", "error")


async def test_ingest_channel_full_success() -> None:
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = [
        {"video_id": "vid1", "title": "Test", "duration_sec": 60, "published_at": None}
    ]
    transcript = {"text": "Hello world. This is a test sentence.", "words": []}
    chunks = [{"text": "Hello world.", "start_sec": 0.0, "end_sec": 5.0, "chunk_index": 0}]
    embeddings = [[0.1, 0.2, 0.3]]

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[])),
        patch("app.workers.ingestion_worker.upsert_video", new=AsyncMock()),
        patch("app.workers.ingestion_worker.download_audio", new=AsyncMock(return_value="/tmp/vid1.mp3")),
        patch("app.workers.ingestion_worker.transcribe", new=AsyncMock(return_value=transcript)),
        patch("app.workers.ingestion_worker.chunk_text", return_value=chunks),
        patch("app.workers.ingestion_worker.embedding_service") as mock_emb,
        patch("app.workers.ingestion_worker.pinecone_service") as mock_pine,
        patch("app.workers.ingestion_worker.upsert_chunks_bulk", new=AsyncMock()),
        patch("app.workers.ingestion_worker.update_video_status", new=AsyncMock()) as mock_status,
    ):
        mock_emb.embed_batch = AsyncMock(return_value=embeddings)
        mock_pine.upsert_vectors = AsyncMock()
        await ingest_channel(ctx=None)
        mock_status.assert_called_with("vid1", "done")


async def test_ingest_channel_handles_pinecone_upsert_failure() -> None:
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = [
        {"video_id": "vid1", "title": "Test", "duration_sec": 60, "published_at": None}
    ]
    transcript = {"text": "Hello world.", "words": []}
    chunks = [{"text": "Hello world.", "start_sec": 0.0, "end_sec": 5.0, "chunk_index": 0}]
    embeddings = [[0.1, 0.2]]

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[])),
        patch("app.workers.ingestion_worker.upsert_video", new=AsyncMock()),
        patch("app.workers.ingestion_worker.download_audio", new=AsyncMock(return_value="/tmp/vid1.mp3")),
        patch("app.workers.ingestion_worker.transcribe", new=AsyncMock(return_value=transcript)),
        patch("app.workers.ingestion_worker.chunk_text", return_value=chunks),
        patch("app.workers.ingestion_worker.embedding_service") as mock_emb,
        patch("app.workers.ingestion_worker.pinecone_service") as mock_pine,
        patch("app.workers.ingestion_worker.update_video_status", new=AsyncMock()) as mock_status,
    ):
        mock_emb.embed_batch = AsyncMock(return_value=embeddings)
        mock_pine.upsert_vectors = AsyncMock(side_effect=Exception("pinecone error"))
        await ingest_channel(ctx=None)
        mock_status.assert_called_with("vid1", "error")


async def test_ingest_channel_skips_video_with_empty_id() -> None:
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = [
        {"video_id": "", "title": "No ID", "duration_sec": None, "published_at": None}
    ]

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[])),
        patch("app.workers.ingestion_worker.upsert_video", new=AsyncMock()) as mock_upsert,
    ):
        await ingest_channel(ctx=None)
        mock_upsert.assert_not_called()


async def test_ingest_channel_handles_existing_map_load_failure() -> None:
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = []

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(side_effect=Exception("db error"))),
    ):
        # Should not raise
        await ingest_channel(ctx=None)


async def test_ingest_channel_handles_supabase_chunk_upsert_failure() -> None:
    from app.workers.ingestion_worker import ingest_channel

    channel_videos: list[dict[str, Any]] = [
        {"video_id": "vid1", "title": "Test", "duration_sec": 60, "published_at": None}
    ]
    transcript = {"text": "Hello world.", "words": []}
    chunks = [{"text": "Hello world.", "start_sec": 0.0, "end_sec": 5.0, "chunk_index": 0}]
    embeddings = [[0.1, 0.2]]

    with (
        patch("app.workers.ingestion_worker.get_channel_videos", new=AsyncMock(return_value=channel_videos)),
        patch("app.workers.ingestion_worker.get_all_videos", new=AsyncMock(return_value=[])),
        patch("app.workers.ingestion_worker.upsert_video", new=AsyncMock()),
        patch("app.workers.ingestion_worker.download_audio", new=AsyncMock(return_value="/tmp/vid1.mp3")),
        patch("app.workers.ingestion_worker.transcribe", new=AsyncMock(return_value=transcript)),
        patch("app.workers.ingestion_worker.chunk_text", return_value=chunks),
        patch("app.workers.ingestion_worker.embedding_service") as mock_emb,
        patch("app.workers.ingestion_worker.pinecone_service") as mock_pine,
        patch("app.workers.ingestion_worker.upsert_chunks_bulk", new=AsyncMock(side_effect=Exception("supabase error"))),
        patch("app.workers.ingestion_worker.update_video_status", new=AsyncMock()) as mock_status,
    ):
        mock_emb.embed_batch = AsyncMock(return_value=embeddings)
        mock_pine.upsert_vectors = AsyncMock()
        await ingest_channel(ctx=None)
        mock_status.assert_called_with("vid1", "error")


# ---------------------------------------------------------------------------
# WorkerSettings
# ---------------------------------------------------------------------------


def test_worker_settings_has_ingest_channel() -> None:
    from app.workers.ingestion_worker import WorkerSettings, ingest_channel

    assert ingest_channel in WorkerSettings.functions
    assert WorkerSettings.queue_name == "arq:queue"
