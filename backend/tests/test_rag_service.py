from __future__ import annotations

import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------


def _make_match(
    text: str = "some context text",
    video_id: str = "vid123",
    video_title: str = "Test Video",
    start_sec: float = 10.0,
    end_sec: float = 20.0,
    score: float = 0.85,
) -> dict[str, Any]:
    return {
        "id": "vec1",
        "score": score,
        "metadata": {
            "text": text,
            "video_id": video_id,
            "video_title": video_title,
            "start_sec": start_sec,
            "end_sec": end_sec,
        },
    }


def _make_openai_response(content: str = "Test answer") -> MagicMock:
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = None
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp


# ---------------------------------------------------------------------------
# _format_timestamp
# ---------------------------------------------------------------------------


def test_format_timestamp_seconds_only() -> None:
    from app.services.rag_service import _format_timestamp

    result = _format_timestamp(65.0, 125.0)
    assert result == "1:05 - 2:05"


def test_format_timestamp_with_hours() -> None:
    from app.services.rag_service import _format_timestamp

    result = _format_timestamp(3661.0, 7322.0)
    assert result == "1:01:01 - 2:02:02"


def test_format_timestamp_zero() -> None:
    from app.services.rag_service import _format_timestamp

    result = _format_timestamp(0.0, 0.0)
    assert result == "0:00 - 0:00"


def test_format_timestamp_exact_minute() -> None:
    from app.services.rag_service import _format_timestamp

    result = _format_timestamp(60.0, 120.0)
    assert result == "1:00 - 2:00"


# ---------------------------------------------------------------------------
# _compute_confidence
# ---------------------------------------------------------------------------


def test_compute_confidence_empty() -> None:
    from app.services.rag_service import _compute_confidence

    assert _compute_confidence([]) == 0.0


def test_compute_confidence_single_match() -> None:
    from app.services.rag_service import _compute_confidence

    result = _compute_confidence([{"score": 0.8}])
    assert result == 0.8


def test_compute_confidence_multiple_matches() -> None:
    from app.services.rag_service import _compute_confidence

    matches = [{"score": 0.6}, {"score": 0.8}, {"score": 1.0}]
    result = _compute_confidence(matches)
    assert abs(result - round((0.6 + 0.8 + 1.0) / 3, 4)) < 1e-4


def test_compute_confidence_clamps_to_one() -> None:
    from app.services.rag_service import _compute_confidence

    result = _compute_confidence([{"score": 1.5}])
    assert result == 1.0


def test_compute_confidence_clamps_to_zero() -> None:
    from app.services.rag_service import _compute_confidence

    result = _compute_confidence([{"score": -0.5}])
    assert result == 0.0


def test_compute_confidence_missing_score_key() -> None:
    from app.services.rag_service import _compute_confidence

    result = _compute_confidence([{}])
    assert result == 0.0


# ---------------------------------------------------------------------------
# _normalize_query / _cache_key
# ---------------------------------------------------------------------------


def test_normalize_query_strips_and_lowercases() -> None:
    from app.services.rag_service import _normalize_query

    assert _normalize_query("  Hello   World  ") == "hello world"


def test_cache_key_is_deterministic() -> None:
    from app.services.rag_service import _cache_key

    assert _cache_key("hello") == _cache_key("hello")


def test_cache_key_differs_for_different_queries() -> None:
    from app.services.rag_service import _cache_key

    assert _cache_key("hello") != _cache_key("world")


def test_cache_key_starts_with_chat_prefix() -> None:
    from app.services.rag_service import _cache_key

    assert _cache_key("test").startswith("chat:")


# ---------------------------------------------------------------------------
# _generate_timestamp_url
# ---------------------------------------------------------------------------


def test_generate_timestamp_url() -> None:
    from app.services.rag_service import _generate_timestamp_url

    url = _generate_timestamp_url("abc123", 65.7)
    assert url == "https://youtu.be/abc123?t=65"


# ---------------------------------------------------------------------------
# ask — cache hit
# ---------------------------------------------------------------------------


async def test_ask_returns_cached_response() -> None:
    from app.schemas.api import ChatResponse
    from app.services.rag_service import ask

    cached_data = ChatResponse(
        answer="cached answer",
        sources=[],
        confidence=0.9,
        conversation_id=None,
        cached=False,
    ).model_dump_json()

    with patch("app.services.rag_service.cache_service.get_cached", new=AsyncMock(return_value=cached_data)):
        result = await ask("test query", None, None)

    assert result.answer == "cached answer"


async def test_ask_returns_empty_sources_when_no_pinecone_results() -> None:
    from app.services.rag_service import ask

    mock_embedding = [0.1] * 10

    mock_rewrite_resp = MagicMock()
    mock_rewrite_resp.choices = [MagicMock(message=MagicMock(content="rewritten query"))]

    mock_openai_client = MagicMock()
    mock_openai_client.chat = MagicMock()
    mock_openai_client.chat.completions = MagicMock()
    mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_rewrite_resp)

    with (
        patch("app.services.rag_service.cache_service.get_cached", new=AsyncMock(return_value=None)),
        patch("app.services.rag_service._get_openai_client", return_value=mock_openai_client),
        patch("app.services.rag_service.embedding_service.embed_text", new=AsyncMock(return_value=mock_embedding)),
        patch("app.services.rag_service.pinecone_service.query_vectors", new=AsyncMock(return_value=[])),
        patch("app.services.rag_service.cache_service.set_cached", new=AsyncMock()),
    ):
        from app.services.rag_service import ask

        result = await ask("test query", None, None)

    assert result.sources == []
    assert result.confidence == 0.0
    assert "couldn't find" in result.answer.lower()


async def test_ask_full_flow_with_matches() -> None:
    from app.services.rag_service import ask

    mock_embedding = [0.1] * 10
    matches = [_make_match()]

    mock_rewrite_resp = MagicMock()
    mock_rewrite_resp.choices = [MagicMock(message=MagicMock(content="rewritten"))]

    mock_chat_resp = _make_openai_response("Here is the answer.")

    mock_openai_client = MagicMock()
    mock_openai_client.chat = MagicMock()
    mock_openai_client.chat.completions = MagicMock()
    mock_openai_client.chat.completions.create = AsyncMock(
        side_effect=[mock_rewrite_resp, mock_chat_resp]
    )

    with (
        patch("app.services.rag_service.cache_service.get_cached", new=AsyncMock(return_value=None)),
        patch("app.services.rag_service._get_openai_client", return_value=mock_openai_client),
        patch("app.services.rag_service.embedding_service.embed_text", new=AsyncMock(return_value=mock_embedding)),
        patch("app.services.rag_service.pinecone_service.query_vectors", new=AsyncMock(return_value=matches)),
        patch("app.services.rag_service.rerank_service.rerank", new=AsyncMock(return_value=[0])),
        patch("app.services.rag_service.cache_service.set_cached", new=AsyncMock()),
        patch("app.services.rag_service._openai_chat", new=AsyncMock(return_value=mock_chat_resp)),
        patch("app.services.rag_service._openai_rewrite", new=AsyncMock(return_value="rewritten")),
    ):
        from app.services.rag_service import ask

        result = await ask("test query", None, None)

    assert result.answer == "Here is the answer."
    assert len(result.sources) == 1
    assert result.sources[0].video_title == "Test Video"


async def test_ask_raises_503_when_embedding_fails() -> None:
    from app.services.rag_service import ask

    with (
        patch("app.services.rag_service.cache_service.get_cached", new=AsyncMock(return_value=None)),
        patch("app.services.rag_service._get_openai_client", return_value=MagicMock()),
        patch(
            "app.services.rag_service.embedding_service.embed_text",
            new=AsyncMock(side_effect=HTTPException(status_code=503, detail="no key")),
        ),
        patch("app.services.rag_service._openai_rewrite", new=AsyncMock(return_value="rewritten")),
    ):
        from app.services.rag_service import ask

        with pytest.raises(HTTPException) as exc_info:
            await ask("test query", None, None)

    assert exc_info.value.status_code == 503


async def test_ask_handles_cache_parse_error_gracefully() -> None:
    from app.services.rag_service import ask

    bad_cache = "not-valid-json"
    mock_embedding = [0.1] * 10
    matches = [_make_match()]
    mock_chat_resp = _make_openai_response("answer after cache error")

    with (
        patch("app.services.rag_service.cache_service.get_cached", new=AsyncMock(return_value=bad_cache)),
        patch("app.services.rag_service._get_openai_client", return_value=MagicMock()),
        patch("app.services.rag_service.embedding_service.embed_text", new=AsyncMock(return_value=mock_embedding)),
        patch("app.services.rag_service.pinecone_service.query_vectors", new=AsyncMock(return_value=matches)),
        patch("app.services.rag_service.rerank_service.rerank", new=AsyncMock(return_value=[0])),
        patch("app.services.rag_service.cache_service.set_cached", new=AsyncMock()),
        patch("app.services.rag_service._openai_chat", new=AsyncMock(return_value=mock_chat_resp)),
        patch("app.services.rag_service._openai_rewrite", new=AsyncMock(return_value="rewritten")),
    ):
        from app.services.rag_service import ask

        result = await ask("test query", None, None)

    assert result.answer == "answer after cache error"


async def test_ask_with_conversation_id_and_user_id() -> None:
    from app.services.rag_service import ask

    conv_id = uuid.uuid4()
    mock_embedding = [0.1] * 10
    matches = [_make_match()]
    mock_chat_resp = _make_openai_response("contextual answer")

    mock_msg = MagicMock()
    mock_msg.role = "user"
    mock_msg.content = "previous message"

    with (
        patch("app.services.rag_service.cache_service.get_cached", new=AsyncMock(return_value=None)),
        patch("app.services.rag_service._get_openai_client", return_value=MagicMock()),
        patch("app.services.rag_service.embedding_service.embed_text", new=AsyncMock(return_value=mock_embedding)),
        patch("app.services.rag_service.pinecone_service.query_vectors", new=AsyncMock(return_value=matches)),
        patch("app.services.rag_service.rerank_service.rerank", new=AsyncMock(return_value=[0])),
        patch("app.services.rag_service.cache_service.set_cached", new=AsyncMock()),
        patch("app.services.rag_service._openai_chat", new=AsyncMock(return_value=mock_chat_resp)),
        patch("app.services.rag_service._openai_rewrite", new=AsyncMock(return_value="rewritten")),
        patch(
            "app.services.rag_service.get_recent_messages",
            new=AsyncMock(return_value=[mock_msg]),
        ),
        patch("app.services.rag_service.add_message", new=AsyncMock()),
    ):
        from app.services.rag_service import ask

        result = await ask("test query", conv_id, "user-123")

    assert result.answer == "contextual answer"
    assert result.conversation_id == conv_id


# ---------------------------------------------------------------------------
# _get_openai_client — no API key
# ---------------------------------------------------------------------------


def test_get_openai_client_raises_503_when_no_api_key() -> None:
    from app.services.rag_service import _get_openai_client

    with patch("app.services.rag_service.settings") as mock_settings:
        mock_settings.OPENAI_API_KEY = ""
        with pytest.raises(HTTPException) as exc_info:
            _get_openai_client()

    assert exc_info.value.status_code == 503


# ---------------------------------------------------------------------------
# _openai_chat — direct call with tools
# ---------------------------------------------------------------------------


async def test_openai_chat_calls_with_tools() -> None:
    from app.services.rag_service import _openai_chat

    mock_response = _make_openai_response("answer")
    mock_client = MagicMock()
    mock_client.chat = MagicMock()
    mock_client.chat.completions = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    tools = [{"type": "function", "function": {"name": "test"}}]
    result = await _openai_chat(mock_client, [{"role": "user", "content": "hi"}], tools=tools)
    assert result == mock_response
    call_kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert "tools" in call_kwargs
    assert call_kwargs["tool_choice"] == "auto"


async def test_openai_chat_calls_without_tools() -> None:
    from app.services.rag_service import _openai_chat

    mock_response = _make_openai_response("answer")
    mock_client = MagicMock()
    mock_client.chat = MagicMock()
    mock_client.chat.completions = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    result = await _openai_chat(mock_client, [{"role": "user", "content": "hi"}])
    assert result == mock_response
    call_kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert "tools" not in call_kwargs
