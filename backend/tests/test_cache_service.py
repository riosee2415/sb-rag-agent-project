from __future__ import annotations

from unittest.mock import AsyncMock, patch

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _reset_cache_module() -> None:
    """Reset module-level globals between tests."""
    import app.services.cache_service as cs

    cs._redis_client = None
    cs._redis_available = False


# ---------------------------------------------------------------------------
# get_cached — no redis
# ---------------------------------------------------------------------------


async def test_get_cached_returns_none_when_no_redis_url() -> None:
    _reset_cache_module()
    with patch("app.core.config.settings") as mock_settings:
        mock_settings.REDIS_URL = ""
        import app.services.cache_service as cs

        cs._redis_client = None
        with patch.object(cs, "_get_redis", new=AsyncMock(return_value=None)):
            result = await cs.get_cached("some-key")
    assert result is None


async def test_get_cached_returns_value_on_cache_hit() -> None:
    import app.services.cache_service as cs

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value="cached-value")

    with patch.object(cs, "_get_redis", new=AsyncMock(return_value=mock_client)):
        result = await cs.get_cached("test-key")

    assert result == "cached-value"


async def test_get_cached_returns_none_on_cache_miss() -> None:
    import app.services.cache_service as cs

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=None)

    with patch.object(cs, "_get_redis", new=AsyncMock(return_value=mock_client)):
        result = await cs.get_cached("missing-key")

    assert result is None


async def test_get_cached_returns_none_on_redis_exception() -> None:
    import app.services.cache_service as cs

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=Exception("connection error"))

    with patch.object(cs, "_get_redis", new=AsyncMock(return_value=mock_client)):
        result = await cs.get_cached("error-key")

    assert result is None


# ---------------------------------------------------------------------------
# set_cached
# ---------------------------------------------------------------------------


async def test_set_cached_noop_when_no_redis() -> None:
    import app.services.cache_service as cs

    with patch.object(cs, "_get_redis", new=AsyncMock(return_value=None)):
        # Should not raise
        await cs.set_cached("key", "value", ttl=60)


async def test_set_cached_calls_redis_setex() -> None:
    import app.services.cache_service as cs

    mock_client = AsyncMock()
    mock_client.setex = AsyncMock(return_value=True)

    with patch.object(cs, "_get_redis", new=AsyncMock(return_value=mock_client)):
        await cs.set_cached("key", "value", ttl=300)

    mock_client.setex.assert_called_once_with("key", 300, "value")


async def test_set_cached_swallows_exception() -> None:
    import app.services.cache_service as cs

    mock_client = AsyncMock()
    mock_client.setex = AsyncMock(side_effect=Exception("write error"))

    with patch.object(cs, "_get_redis", new=AsyncMock(return_value=mock_client)):
        # Should not raise
        await cs.set_cached("key", "value")


# ---------------------------------------------------------------------------
# invalidate_all
# ---------------------------------------------------------------------------


async def test_invalidate_all_noop_when_no_redis() -> None:
    import app.services.cache_service as cs

    with patch.object(cs, "_get_redis", new=AsyncMock(return_value=None)):
        await cs.invalidate_all()


async def test_invalidate_all_calls_flushdb() -> None:
    import app.services.cache_service as cs

    mock_client = AsyncMock()
    mock_client.flushdb = AsyncMock(return_value=True)

    with patch.object(cs, "_get_redis", new=AsyncMock(return_value=mock_client)):
        await cs.invalidate_all()

    mock_client.flushdb.assert_called_once()


async def test_invalidate_all_swallows_exception() -> None:
    import app.services.cache_service as cs

    mock_client = AsyncMock()
    mock_client.flushdb = AsyncMock(side_effect=Exception("flush error"))

    with patch.object(cs, "_get_redis", new=AsyncMock(return_value=mock_client)):
        await cs.invalidate_all()


# ---------------------------------------------------------------------------
# _get_redis — graceful degradation
# ---------------------------------------------------------------------------


async def test_get_redis_returns_none_when_redis_url_empty() -> None:
    _reset_cache_module()
    import app.services.cache_service as cs

    with patch("app.services.cache_service.settings") as mock_settings:
        mock_settings.REDIS_URL = ""
        result = await cs._get_redis()

    assert result is None


async def test_get_redis_returns_none_on_ping_failure() -> None:
    _reset_cache_module()
    import app.services.cache_service as cs

    mock_redis_client = AsyncMock()
    mock_redis_client.ping = AsyncMock(side_effect=Exception("refused"))

    with patch("app.services.cache_service.settings") as mock_settings:
        mock_settings.REDIS_URL = "redis://localhost:6379"
        with patch("redis.asyncio.from_url", return_value=mock_redis_client):
            result = await cs._get_redis()

    assert result is None
    assert cs._redis_available is False
