from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_supabase_client() -> MagicMock:
    """Build a chainable supabase mock client."""
    client = MagicMock()
    # Make every chained call return a new MagicMock that is also await-able
    table_mock = MagicMock()
    client.table = MagicMock(return_value=table_mock)

    # Each chained method returns self so we can chain arbitrarily
    for method in ("select", "eq", "order", "limit", "insert", "upsert", "update", "delete"):
        setattr(table_mock, method, MagicMock(return_value=table_mock))

    return client, table_mock


def _make_conv_row(
    conv_id: str | None = None,
    user_id: str = "user-1",
    title: str = "Test Conv",
    device_hint: str | None = None,
    updated_at: str = "2024-01-01T00:00:00",
) -> dict[str, Any]:
    return {
        "id": conv_id or str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "device_hint": device_hint,
        "updated_at": updated_at,
    }


def _make_msg_row(
    msg_id: str | None = None,
    role: str = "user",
    content: str = "hello",
    conversation_id: str | None = None,
    sources: list[Any] | None = None,
    created_at: str = "2024-01-01T00:00:00",
) -> dict[str, Any]:
    return {
        "id": msg_id or str(uuid.uuid4()),
        "role": role,
        "content": content,
        "conversation_id": conversation_id or str(uuid.uuid4()),
        "sources": sources,
        "created_at": created_at,
    }


# ---------------------------------------------------------------------------
# conversations._row_to_message
# ---------------------------------------------------------------------------


def test_row_to_message_without_sources() -> None:
    from app.db.queries.conversations import _row_to_message

    row = _make_msg_row()
    msg = _row_to_message(row)
    assert msg.role == "user"
    assert msg.content == "hello"
    assert msg.sources is None


def test_row_to_message_with_sources() -> None:
    from app.db.queries.conversations import _row_to_message

    sources_data = [
        {
            "video_title": "Test",
            "timestamp_label": "0:00 - 0:30",
            "timestamp_url": "https://youtu.be/abc",
            "excerpt": "some text",
        }
    ]
    row = _make_msg_row(sources=sources_data)
    msg = _row_to_message(row)
    assert msg.sources is not None
    assert len(msg.sources) == 1
    assert msg.sources[0].video_title == "Test"


# ---------------------------------------------------------------------------
# conversations.get_conversations_by_user
# ---------------------------------------------------------------------------


async def test_get_conversations_by_user_returns_list() -> None:
    from app.db.queries.conversations import get_conversations_by_user

    conv_id = str(uuid.uuid4())
    row = _make_conv_row(conv_id=conv_id)
    execute_result = MagicMock(data=[row])

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await get_conversations_by_user("user-1")

    assert len(result) == 1
    assert result[0].title == "Test Conv"


async def test_get_conversations_by_user_empty() -> None:
    from app.db.queries.conversations import get_conversations_by_user

    execute_result = MagicMock(data=[])
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await get_conversations_by_user("user-1")

    assert result == []


async def test_get_conversations_by_user_raises_on_error() -> None:
    from app.db.queries.conversations import get_conversations_by_user

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(side_effect=Exception("db error"))

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        with pytest.raises(Exception, match="db error"):
            await get_conversations_by_user("user-1")


# ---------------------------------------------------------------------------
# conversations.create_conversation
# ---------------------------------------------------------------------------


async def test_create_conversation_success() -> None:
    from app.db.queries.conversations import create_conversation

    conv_id = str(uuid.uuid4())
    row = _make_conv_row(conv_id=conv_id, title="Hello conv")
    execute_result = MagicMock(data=[row])

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await create_conversation("user-1", "Hello conv", None)

    assert result.title == "Hello conv"


async def test_create_conversation_with_device_hint() -> None:
    from app.db.queries.conversations import create_conversation

    conv_id = str(uuid.uuid4())
    row = _make_conv_row(conv_id=conv_id, device_hint="mobile")
    execute_result = MagicMock(data=[row])

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await create_conversation("user-1", None, "mobile")

    assert result.device_hint == "mobile"


# ---------------------------------------------------------------------------
# conversations.get_messages_by_conversation
# ---------------------------------------------------------------------------


async def test_get_messages_by_conversation_returns_empty_when_no_ownership() -> None:
    from app.db.queries.conversations import get_messages_by_conversation

    conv_id = uuid.uuid4()
    execute_result = MagicMock(data=[])  # ownership check fails

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await get_messages_by_conversation(conv_id, "user-1")

    assert result == []


async def test_get_messages_by_conversation_returns_messages() -> None:
    from app.db.queries.conversations import get_messages_by_conversation

    conv_id = uuid.uuid4()
    msg_row = _make_msg_row(role="assistant", content="answer", conversation_id=str(conv_id))

    # First call: ownership check returns data
    ownership_result = MagicMock(data=[{"id": str(conv_id)}])
    messages_result = MagicMock(data=[msg_row])

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(side_effect=[ownership_result, messages_result])

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await get_messages_by_conversation(conv_id, "user-1")

    assert len(result) == 1
    assert result[0].role == "assistant"


# ---------------------------------------------------------------------------
# conversations.delete_conversation
# ---------------------------------------------------------------------------


async def test_delete_conversation_success() -> None:
    from app.db.queries.conversations import delete_conversation

    conv_id = uuid.uuid4()
    execute_result = MagicMock(data=[])

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        await delete_conversation(conv_id, "user-1")


async def test_delete_conversation_raises_on_error() -> None:
    from app.db.queries.conversations import delete_conversation

    conv_id = uuid.uuid4()
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(side_effect=Exception("delete error"))

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        with pytest.raises(Exception, match="delete error"):
            await delete_conversation(conv_id, "user-1")


# ---------------------------------------------------------------------------
# conversations.add_message
# ---------------------------------------------------------------------------


async def test_add_message_without_sources() -> None:
    from app.db.queries.conversations import add_message

    conv_id = uuid.uuid4()
    msg_row = _make_msg_row(role="user", content="hello")
    execute_result = MagicMock(data=[msg_row])

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await add_message(conv_id, "user", "hello", None)

    assert result.content == "hello"


async def test_add_message_with_sources() -> None:
    from app.db.queries.conversations import add_message
    from app.schemas.api import SourceItem

    conv_id = uuid.uuid4()
    msg_row = _make_msg_row(role="assistant", content="answer")
    execute_result = MagicMock(data=[msg_row])

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    sources = [
        SourceItem(
            video_title="Vid",
            timestamp_label="0:00 - 0:10",
            timestamp_url="https://youtu.be/x",
            excerpt="text",
        )
    ]
    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await add_message(conv_id, "assistant", "answer", sources)

    assert result.role == "assistant"


# ---------------------------------------------------------------------------
# conversations.get_recent_messages
# ---------------------------------------------------------------------------


async def test_get_recent_messages_without_user_id() -> None:
    from app.db.queries.conversations import get_recent_messages

    conv_id = uuid.uuid4()
    msg_row = _make_msg_row(role="user", content="msg")
    execute_result = MagicMock(data=[msg_row])

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await get_recent_messages(conv_id, user_id=None, limit=5)

    assert len(result) == 1


async def test_get_recent_messages_with_user_id_no_ownership() -> None:
    from app.db.queries.conversations import get_recent_messages

    conv_id = uuid.uuid4()
    # Ownership check returns empty
    execute_result = MagicMock(data=[])

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.conversations.get_supabase", new=AsyncMock(return_value=client)):
        result = await get_recent_messages(conv_id, user_id="user-1", limit=5)

    assert result == []


# ---------------------------------------------------------------------------
# videos.get_all_videos
# ---------------------------------------------------------------------------


async def test_get_all_videos_returns_list() -> None:
    from app.db.queries.videos import get_all_videos

    row: dict[str, Any] = {
        "video_id": "vid1",
        "title": "Test Video",
        "duration_sec": 120,
        "published_at": "2024-01-01T00:00:00",
        "status": "done",
    }
    execute_result = MagicMock(data=[row])
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        result = await get_all_videos()

    assert len(result) == 1
    assert result[0].video_id == "vid1"
    assert result[0].status == "done"


async def test_get_all_videos_handles_null_fields() -> None:
    from app.db.queries.videos import get_all_videos

    row: dict[str, Any] = {
        "video_id": "vid2",
        "title": "No Duration",
        "duration_sec": None,
        "published_at": None,
        "status": "pending",
    }
    execute_result = MagicMock(data=[row])
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        result = await get_all_videos()

    assert result[0].duration_sec is None
    assert result[0].published_at is None


async def test_get_all_videos_raises_on_error() -> None:
    from app.db.queries.videos import get_all_videos

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(side_effect=Exception("db error"))

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        with pytest.raises(Exception, match="db error"):
            await get_all_videos()


# ---------------------------------------------------------------------------
# videos.get_video_status_counts
# ---------------------------------------------------------------------------


async def test_get_video_status_counts() -> None:
    from app.db.queries.videos import get_video_status_counts

    rows = [
        {"status": "done"},
        {"status": "done"},
        {"status": "pending"},
        {"status": "error"},
    ]
    execute_result = MagicMock(data=rows)
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        result = await get_video_status_counts()

    assert result.total_videos == 4
    assert result.done == 2
    assert result.pending == 1
    assert result.error == 1


# ---------------------------------------------------------------------------
# videos.upsert_video
# ---------------------------------------------------------------------------


async def test_upsert_video_with_all_fields() -> None:
    from app.db.queries.videos import upsert_video

    execute_result = MagicMock(data=[])
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        await upsert_video(
            "vid1",
            "Title",
            300,
            datetime(2024, 1, 1, tzinfo=UTC),
        )


async def test_upsert_video_without_optional_fields() -> None:
    from app.db.queries.videos import upsert_video

    execute_result = MagicMock(data=[])
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        await upsert_video("vid2", "Title", None, None)


async def test_upsert_video_raises_on_error() -> None:
    from app.db.queries.videos import upsert_video

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(side_effect=Exception("upsert error"))

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        with pytest.raises(Exception, match="upsert error"):
            await upsert_video("vid3", "T", None, None)


# ---------------------------------------------------------------------------
# videos.update_video_status
# ---------------------------------------------------------------------------


async def test_update_video_status_success() -> None:
    from app.db.queries.videos import update_video_status

    execute_result = MagicMock(data=[])
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        await update_video_status("vid1", "done")


async def test_update_video_status_raises_on_error() -> None:
    from app.db.queries.videos import update_video_status

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(side_effect=Exception("update error"))

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        with pytest.raises(Exception, match="update error"):
            await update_video_status("vid1", "error")


# ---------------------------------------------------------------------------
# videos.upsert_chunk
# ---------------------------------------------------------------------------


async def test_upsert_chunk_success() -> None:
    from app.db.queries.videos import upsert_chunk

    execute_result = MagicMock(data=[])
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        await upsert_chunk("vid1", 0, "some text", 0.0, 30.0)


async def test_upsert_chunk_raises_on_error() -> None:
    from app.db.queries.videos import upsert_chunk

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(side_effect=Exception("chunk error"))

    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        with pytest.raises(Exception, match="chunk error"):
            await upsert_chunk("vid1", 0, "text", 0.0, 30.0)


# ---------------------------------------------------------------------------
# videos.upsert_chunks_bulk
# ---------------------------------------------------------------------------


async def test_upsert_chunks_bulk_empty_list() -> None:
    from app.db.queries.videos import upsert_chunks_bulk

    # Should return immediately without calling supabase
    with patch("app.db.queries.videos.get_supabase", new=AsyncMock()) as mock_get:
        await upsert_chunks_bulk("vid1", [])
        mock_get.assert_not_called()


async def test_upsert_chunks_bulk_with_chunks() -> None:
    from app.db.queries.videos import upsert_chunks_bulk

    execute_result = MagicMock(data=[])
    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(return_value=execute_result)

    chunks = [
        {"chunk_index": 0, "text": "chunk 0", "start_sec": 0.0, "end_sec": 10.0},
        {"chunk_index": 1, "text": "chunk 1", "start_sec": 10.0, "end_sec": 20.0},
    ]
    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        await upsert_chunks_bulk("vid1", chunks)


async def test_upsert_chunks_bulk_raises_on_error() -> None:
    from app.db.queries.videos import upsert_chunks_bulk

    client, table_mock = _make_supabase_client()
    table_mock.execute = AsyncMock(side_effect=Exception("bulk error"))

    chunks = [{"chunk_index": 0, "text": "t", "start_sec": 0.0, "end_sec": 1.0}]
    with patch("app.db.queries.videos.get_supabase", new=AsyncMock(return_value=client)):
        with pytest.raises(Exception, match="bulk error"):
            await upsert_chunks_bulk("vid1", chunks)
