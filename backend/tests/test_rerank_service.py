from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# rerank — no cohere key
# ---------------------------------------------------------------------------


async def test_rerank_returns_passthrough_when_no_cohere_key() -> None:
    with patch("app.services.rerank_service.settings") as mock_settings:
        mock_settings.COHERE_API_KEY = ""
        from app.services.rerank_service import rerank

        docs = ["doc a", "doc b", "doc c"]
        result = await rerank("query", docs, top_n=3)

    assert result == [0, 1, 2]


async def test_rerank_limits_to_top_n_when_no_cohere_key() -> None:
    with patch("app.services.rerank_service.settings") as mock_settings:
        mock_settings.COHERE_API_KEY = ""
        from app.services.rerank_service import rerank

        docs = ["a", "b", "c", "d", "e"]
        result = await rerank("query", docs, top_n=2)

    assert result == [0, 1]


async def test_rerank_handles_fewer_docs_than_top_n() -> None:
    with patch("app.services.rerank_service.settings") as mock_settings:
        mock_settings.COHERE_API_KEY = ""
        from app.services.rerank_service import rerank

        docs = ["only one"]
        result = await rerank("query", docs, top_n=5)

    assert result == [0]


async def test_rerank_empty_docs() -> None:
    with patch("app.services.rerank_service.settings") as mock_settings:
        mock_settings.COHERE_API_KEY = ""
        from app.services.rerank_service import rerank

        result = await rerank("query", [], top_n=5)

    assert result == []


# ---------------------------------------------------------------------------
# rerank — with cohere key (mocked)
# ---------------------------------------------------------------------------


async def test_rerank_calls_cohere_when_key_present() -> None:
    mock_result_0 = MagicMock(index=2)
    mock_result_1 = MagicMock(index=0)
    mock_response = MagicMock()
    mock_response.results = [mock_result_0, mock_result_1]

    mock_co = AsyncMock()
    mock_co.rerank = AsyncMock(return_value=mock_response)

    mock_cohere_module = MagicMock()
    mock_cohere_module.AsyncClient = MagicMock(return_value=mock_co)

    with patch("app.services.rerank_service.settings") as mock_settings:
        mock_settings.COHERE_API_KEY = "test-cohere-key"
        with patch.dict("sys.modules", {"cohere": mock_cohere_module}):
            # Force reload to pick up patched settings
            import importlib

            from app.services import rerank_service

            importlib.reload(rerank_service)

            with patch("app.services.rerank_service.settings") as ms2:
                ms2.COHERE_API_KEY = "test-cohere-key"
                result = await rerank_service.rerank("query", ["doc0", "doc1", "doc2"], top_n=2)

    assert result == [2, 0]


async def test_rerank_falls_back_on_cohere_exception() -> None:
    mock_co = AsyncMock()
    mock_co.rerank = AsyncMock(side_effect=Exception("cohere error"))

    mock_cohere_module = MagicMock()
    mock_cohere_module.AsyncClient = MagicMock(return_value=mock_co)

    with patch("app.services.rerank_service.settings") as mock_settings:
        mock_settings.COHERE_API_KEY = "test-cohere-key"
        with patch.dict("sys.modules", {"cohere": mock_cohere_module}):
            import importlib

            from app.services import rerank_service

            importlib.reload(rerank_service)

            with patch("app.services.rerank_service.settings") as ms2:
                ms2.COHERE_API_KEY = "test-cohere-key"
                result = await rerank_service.rerank("query", ["a", "b", "c"], top_n=2)

    # Falls back to passthrough on exception
    assert result == [0, 1]
