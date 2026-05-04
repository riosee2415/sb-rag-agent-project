from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.dependencies import require_user, verify_api_secret
from app.db.queries.conversations import (
    create_conversation,
    delete_conversation,
    get_conversations_by_user,
    get_messages_by_conversation,
)
from app.schemas.api import (
    ConversationCreateRequest,
    ConversationItem,
    ConversationMessagesResponse,
    ConversationsListResponse,
)

router = APIRouter(prefix="/api/v1", dependencies=[Depends(verify_api_secret)])


@router.post("/conversations/list", response_model=ConversationsListResponse, status_code=200)
async def list_conversations(
    user: Annotated[dict[str, str], Depends(require_user)],
) -> ConversationsListResponse:
    conversations = await get_conversations_by_user(user["user_id"])
    return ConversationsListResponse(conversations=conversations)


@router.post("/conversations", response_model=ConversationItem, status_code=200)
async def create_new_conversation(
    body: ConversationCreateRequest,
    user: Annotated[dict[str, str], Depends(require_user)],
) -> ConversationItem:
    return await create_conversation(
        user_id=user["user_id"],
        title=body.title,
        device_hint=body.device_hint,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ConversationMessagesResponse,
    status_code=200,
)
async def get_messages(
    conversation_id: uuid.UUID,
    user: Annotated[dict[str, str], Depends(require_user)],
) -> ConversationMessagesResponse:
    messages = await get_messages_by_conversation(conversation_id, user["user_id"])
    return ConversationMessagesResponse(messages=messages)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def remove_conversation(
    conversation_id: uuid.UUID,
    user: Annotated[dict[str, str], Depends(require_user)],
) -> Response:
    await delete_conversation(conversation_id, user["user_id"])
    return Response(status_code=204)
