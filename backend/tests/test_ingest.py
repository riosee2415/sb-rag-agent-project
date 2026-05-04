from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ingest_no_api_secret_returns_403(client: AsyncClient) -> None:
    response = await client.post("/api/v1/ingest")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_ingest_success(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    response = await client.post("/api/v1/ingest", headers=api_secret_headers)
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert "status" in data
    assert data["status"] in ("queued", "started", "already_running")


@pytest.mark.asyncio
async def test_status_no_api_secret_returns_403(client: AsyncClient) -> None:
    response = await client.post("/api/v1/status")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_status_success(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    from app.schemas.api import StatusResponse

    mock_status = StatusResponse(
        total_videos=10,
        done=8,
        pending=1,
        error=1,
        last_updated=datetime.now(tz=UTC),
    )

    with patch(
        "app.routers.ingest.get_video_status_counts", new_callable=AsyncMock
    ) as mock_fn:
        mock_fn.return_value = mock_status
        response = await client.post("/api/v1/status", headers=api_secret_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["total_videos"] == 10
    assert data["done"] == 8
    assert data["pending"] == 1
    assert data["error"] == 1
