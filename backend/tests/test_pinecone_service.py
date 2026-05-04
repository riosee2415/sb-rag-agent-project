from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest


def _reset_pinecone_state() -> None:
    import app.services.pinecone_service as ps

    ps._index = None
    ps._initialized = False


# ---------------------------------------------------------------------------
# query_vectors — index None
# ---------------------------------------------------------------------------


async def test_query_vectors_returns_empty_when_index_none() -> None:
    _reset_pinecone_state()
    from app.services.pinecone_service import query_vectors

    result = await query_vectors([0.1, 0.2, 0.3], top_k=5)
    assert result == []


async def test_query_vectors_returns_matches_when_index_set() -> None:
    import app.services.pinecone_service as ps

    mock_match = MagicMock()
    mock_match.id = "vec1"
    mock_match.score = 0.9
    mock_match.metadata = {"text": "hello"}

    mock_result = MagicMock()
    mock_result.matches = [mock_match]

    mock_index = MagicMock()
    mock_index.query = MagicMock(return_value=mock_result)

    ps._index = mock_index
    try:
        from app.services.pinecone_service import query_vectors

        result = await query_vectors([0.1, 0.2], top_k=5)
    finally:
        _reset_pinecone_state()

    assert result == [{"id": "vec1", "score": 0.9, "metadata": {"text": "hello"}}]


async def test_query_vectors_returns_empty_on_exception() -> None:
    import app.services.pinecone_service as ps

    mock_index = MagicMock()
    mock_index.query = MagicMock(side_effect=Exception("pinecone error"))

    ps._index = mock_index
    try:
        from app.services.pinecone_service import query_vectors

        result = await query_vectors([0.1, 0.2], top_k=5)
    finally:
        _reset_pinecone_state()

    assert result == []


# ---------------------------------------------------------------------------
# upsert_vectors
# ---------------------------------------------------------------------------


async def test_upsert_vectors_skips_when_index_none() -> None:
    _reset_pinecone_state()
    from app.services.pinecone_service import upsert_vectors

    # Should not raise
    await upsert_vectors([{"id": "v1", "values": [0.1, 0.2]}])


async def test_upsert_vectors_calls_index_upsert() -> None:
    import app.services.pinecone_service as ps

    mock_index = MagicMock()
    mock_index.upsert = MagicMock(return_value=None)

    ps._index = mock_index
    records = [{"id": "v1", "values": [0.1, 0.2]}]
    try:
        from app.services.pinecone_service import upsert_vectors

        await upsert_vectors(records)
    finally:
        _reset_pinecone_state()

    mock_index.upsert.assert_called_once_with(vectors=records)


async def test_upsert_vectors_raises_on_exception() -> None:
    import app.services.pinecone_service as ps

    mock_index = MagicMock()
    mock_index.upsert = MagicMock(side_effect=Exception("upsert failed"))

    ps._index = mock_index
    try:
        from app.services.pinecone_service import upsert_vectors

        with pytest.raises(Exception, match="upsert failed"):
            await upsert_vectors([{"id": "v1", "values": [0.1]}])
    finally:
        _reset_pinecone_state()


# ---------------------------------------------------------------------------
# init_index
# ---------------------------------------------------------------------------


async def test_init_index_skips_when_no_api_key() -> None:
    _reset_pinecone_state()
    import app.services.pinecone_service as ps

    with patch("app.services.pinecone_service.settings") as mock_settings:
        mock_settings.PINECONE_API_KEY = ""
        from app.services.pinecone_service import init_index

        await init_index()

    assert ps._index is None
    assert ps._initialized is False


async def test_init_index_logs_error_when_index_not_in_list() -> None:
    _reset_pinecone_state()
    import app.services.pinecone_service as ps

    class FakeIdx:
        name = "other-index"

    mock_pc = MagicMock()
    mock_pc.list_indexes = MagicMock(return_value=[FakeIdx()])

    import sys

    mock_pinecone_mod = MagicMock()
    mock_pinecone_mod.Pinecone = MagicMock(return_value=mock_pc)

    with patch("app.services.pinecone_service.settings") as mock_settings:
        mock_settings.PINECONE_API_KEY = "test-key"
        mock_settings.PINECONE_INDEX_NAME = "missing-index"
        with patch.dict(sys.modules, {"pinecone": mock_pinecone_mod}):
            from app.services.pinecone_service import init_index

            await init_index()

    assert ps._initialized is False


async def test_init_index_handles_exception_gracefully() -> None:
    _reset_pinecone_state()
    import app.services.pinecone_service as ps

    with patch("app.services.pinecone_service.settings") as mock_settings:
        mock_settings.PINECONE_API_KEY = "test-key"
        mock_settings.PINECONE_INDEX_NAME = "test-index"
        with patch.dict(
            "sys.modules",
            {"pinecone": MagicMock(Pinecone=MagicMock(side_effect=Exception("init error")))},
        ):
            from app.services.pinecone_service import init_index

            await init_index()

    assert ps._initialized is False
