from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_no_api_secret_returns_403(client: AsyncClient) -> None:
    response = await client.post("/api/v1/chat", json={"query": "What is FastAPI?"})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_chat_empty_query_returns_422(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/chat",
        json={"query": ""},
        headers=api_secret_headers,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_missing_query_returns_422(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/chat",
        json={},
        headers=api_secret_headers,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_success(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    from app.schemas.api import ChatResponse

    mock_response = ChatResponse(
        answer="FastAPI is a modern web framework.",
        sources=[],
        confidence=0.85,
        conversation_id=None,
        cached=False,
    )

    with patch("app.routers.chat.rag_service.ask", new_callable=AsyncMock) as mock_ask:
        mock_ask.return_value = mock_response
        response = await client.post(
            "/api/v1/chat",
            json={"query": "What is FastAPI?"},
            headers=api_secret_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "FastAPI is a modern web framework."
    assert data["cached"] is False
    assert isinstance(data["sources"], list)


@pytest.mark.asyncio
async def test_chat_with_conversation_id(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    import uuid

    from app.schemas.api import ChatResponse

    conv_id = uuid.uuid4()
    mock_response = ChatResponse(
        answer="Test answer.",
        sources=[],
        confidence=0.7,
        conversation_id=conv_id,
        cached=False,
    )

    with patch("app.routers.chat.rag_service.ask", new_callable=AsyncMock) as mock_ask:
        mock_ask.return_value = mock_response
        response = await client.post(
            "/api/v1/chat",
            json={"query": "Test question?", "conversation_id": str(conv_id)},
            headers=api_secret_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["conversation_id"] == str(conv_id)


@pytest.mark.asyncio
async def test_videos_no_api_secret_returns_403(client: AsyncClient) -> None:
    response = await client.post("/api/v1/videos")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_videos_success(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    from app.schemas.api import VideoItem

    mock_videos = [
        VideoItem(
            video_id="abc123",
            title="Test Video",
            duration_sec=300,
            published_at=None,
            status="done",
        )
    ]

    with patch(
        "app.routers.chat.get_all_videos", new_callable=AsyncMock
    ) as mock_videos_fn:
        mock_videos_fn.return_value = mock_videos
        response = await client.post("/api/v1/videos", headers=api_secret_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["videos"][0]["video_id"] == "abc123"
