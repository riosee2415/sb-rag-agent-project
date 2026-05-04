from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_conversations_list_no_api_secret_returns_403(client: AsyncClient) -> None:
    response = await client.post("/api/v1/conversations/list")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_conversations_list_no_jwt_returns_401(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/conversations/list", headers=api_secret_headers
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_conversations_list_success(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    from app.schemas.api import ConversationItem

    mock_conversations = [
        ConversationItem(
            id=uuid.uuid4(),
            title="Test Conversation",
            device_hint=None,
            updated_at=datetime.now(tz=UTC),
        )
    ]

    with patch(
        "app.routers.conversations.get_conversations_by_user",
        new_callable=AsyncMock,
    ) as mock_fn:
        mock_fn.return_value = mock_conversations
        response = await client.post(
            "/api/v1/conversations/list", headers=auth_headers
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["conversations"]) == 1
    assert data["conversations"][0]["title"] == "Test Conversation"


@pytest.mark.asyncio
async def test_create_conversation_no_api_secret_returns_403(
    client: AsyncClient,
) -> None:
    response = await client.post("/api/v1/conversations", json={})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_conversation_no_jwt_returns_401(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/conversations", json={}, headers=api_secret_headers
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_conversation_success(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    from app.schemas.api import ConversationItem

    new_conv = ConversationItem(
        id=uuid.uuid4(),
        title="My Conversation",
        device_hint="mobile",
        updated_at=datetime.now(tz=UTC),
    )

    with patch(
        "app.routers.conversations.create_conversation",
        new_callable=AsyncMock,
    ) as mock_fn:
        mock_fn.return_value = new_conv
        response = await client.post(
            "/api/v1/conversations",
            json={"title": "My Conversation", "device_hint": "mobile"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "My Conversation"
    assert data["device_hint"] == "mobile"


@pytest.mark.asyncio
async def test_get_messages_no_api_secret_returns_403(client: AsyncClient) -> None:
    conv_id = uuid.uuid4()
    response = await client.post(f"/api/v1/conversations/{conv_id}/messages")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_messages_no_jwt_returns_401(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    conv_id = uuid.uuid4()
    response = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        headers=api_secret_headers,
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_messages_success(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    from app.schemas.api import MessageItem

    conv_id = uuid.uuid4()
    mock_messages = [
        MessageItem(
            id=uuid.uuid4(),
            role="user",
            content="Hello",
            sources=None,
            created_at=datetime.now(tz=UTC),
        ),
        MessageItem(
            id=uuid.uuid4(),
            role="assistant",
            content="Hi there!",
            sources=[],
            created_at=datetime.now(tz=UTC),
        ),
    ]

    with patch(
        "app.routers.conversations.get_messages_by_conversation",
        new_callable=AsyncMock,
    ) as mock_fn:
        mock_fn.return_value = mock_messages
        response = await client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"


@pytest.mark.asyncio
async def test_delete_conversation_no_api_secret_returns_403(
    client: AsyncClient,
) -> None:
    conv_id = uuid.uuid4()
    response = await client.delete(f"/api/v1/conversations/{conv_id}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_conversation_no_jwt_returns_401(
    client: AsyncClient,
    api_secret_headers: dict[str, str],
) -> None:
    conv_id = uuid.uuid4()
    response = await client.delete(
        f"/api/v1/conversations/{conv_id}", headers=api_secret_headers
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_conversation_success(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    conv_id = uuid.uuid4()

    with patch(
        "app.routers.conversations.delete_conversation",
        new_callable=AsyncMock,
    ) as mock_fn:
        mock_fn.return_value = None
        response = await client.delete(
            f"/api/v1/conversations/{conv_id}", headers=auth_headers
        )

    assert response.status_code == 204
