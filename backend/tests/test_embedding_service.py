from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException


def _reset_embedding_client() -> None:
    import app.services.embedding_service as es

    es._client = None


# ---------------------------------------------------------------------------
# _get_client
# ---------------------------------------------------------------------------


def test_get_client_raises_503_when_no_api_key() -> None:
    _reset_embedding_client()
    with patch("app.services.embedding_service.settings") as mock_settings:
        mock_settings.OPENAI_API_KEY = ""
        from app.services.embedding_service import _get_client

        with pytest.raises(HTTPException) as exc_info:
            _get_client()

    assert exc_info.value.status_code == 503


def test_get_client_creates_client_when_key_present() -> None:
    _reset_embedding_client()
    with patch("app.services.embedding_service.settings") as mock_settings:
        mock_settings.OPENAI_API_KEY = "sk-test-key"
        with patch("app.services.embedding_service.AsyncOpenAI") as mock_cls:
            mock_cls.return_value = MagicMock()
            from app.services.embedding_service import _get_client

            client = _get_client()
            assert client is not None


# ---------------------------------------------------------------------------
# embed_text
# ---------------------------------------------------------------------------


async def test_embed_text_returns_embedding_on_success() -> None:
    _reset_embedding_client()
    mock_embedding = [0.1, 0.2, 0.3]

    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=mock_embedding)]

    mock_client = MagicMock()
    mock_client.embeddings.create = AsyncMock(return_value=mock_response)

    with patch("app.services.embedding_service._get_client", return_value=mock_client):
        from app.services.embedding_service import embed_text

        result = await embed_text("test text")

    assert result == mock_embedding


async def test_embed_text_raises_503_on_api_error() -> None:
    _reset_embedding_client()
    mock_client = MagicMock()
    mock_client.embeddings.create = AsyncMock(side_effect=RuntimeError("API down"))

    with patch("app.services.embedding_service._get_client", return_value=mock_client):
        from app.services.embedding_service import embed_text

        with pytest.raises(HTTPException) as exc_info:
            await embed_text("test text")

    assert exc_info.value.status_code == 503


async def test_embed_text_re_raises_http_exception() -> None:
    _reset_embedding_client()
    original_exc = HTTPException(status_code=503, detail="upstream")
    mock_client = MagicMock()
    mock_client.embeddings.create = AsyncMock(side_effect=original_exc)

    with patch("app.services.embedding_service._get_client", return_value=mock_client):
        from app.services.embedding_service import embed_text

        with pytest.raises(HTTPException) as exc_info:
            await embed_text("test text")

    assert exc_info.value.status_code == 503


# ---------------------------------------------------------------------------
# embed_batch
# ---------------------------------------------------------------------------


async def test_embed_batch_returns_embeddings_sorted_by_index() -> None:
    _reset_embedding_client()
    item0 = MagicMock(embedding=[1.0, 2.0], index=0)
    item1 = MagicMock(embedding=[3.0, 4.0], index=1)

    mock_response = MagicMock()
    mock_response.data = [item1, item0]  # reversed order

    mock_client = MagicMock()
    mock_client.embeddings.create = AsyncMock(return_value=mock_response)

    with patch("app.services.embedding_service._get_client", return_value=mock_client):
        from app.services.embedding_service import embed_batch

        result = await embed_batch(["text0", "text1"])

    assert result == [[1.0, 2.0], [3.0, 4.0]]


async def test_embed_batch_single_item() -> None:
    _reset_embedding_client()
    item = MagicMock(embedding=[0.5, 0.6], index=0)

    mock_response = MagicMock()
    mock_response.data = [item]

    mock_client = MagicMock()
    mock_client.embeddings.create = AsyncMock(return_value=mock_response)

    with patch("app.services.embedding_service._get_client", return_value=mock_client):
        from app.services.embedding_service import embed_batch

        result = await embed_batch(["single"])

    assert result == [[0.5, 0.6]]


async def test_embed_batch_raises_503_on_api_error() -> None:
    _reset_embedding_client()
    mock_client = MagicMock()
    mock_client.embeddings.create = AsyncMock(side_effect=RuntimeError("batch failed"))

    with patch("app.services.embedding_service._get_client", return_value=mock_client):
        from app.services.embedding_service import embed_batch

        with pytest.raises(HTTPException) as exc_info:
            await embed_batch(["text1", "text2"])

    assert exc_info.value.status_code == 503
