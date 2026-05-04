from __future__ import annotations

import uuid
from typing import Any, cast

from loguru import logger

from app.db.client import get_supabase
from app.schemas.api import ConversationItem, MessageItem, SourceItem


async def get_conversations_by_user(user_id: str) -> list[ConversationItem]:
    client = await get_supabase()
    try:
        result = (
            await client.table("conversations")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        rows: list[dict[str, Any]] = cast(list[dict[str, Any]], result.data or [])
        return [
            ConversationItem(
                id=uuid.UUID(str(row["id"])),
                title=str(row.get("title", "")),
                device_hint=str(row["device_hint"]) if row.get("device_hint") else None,
                updated_at=str(row["updated_at"]),
            )
            for row in rows
        ]
    except Exception as exc:
        logger.error(f"get_conversations_by_user failed for user {user_id}: {exc}")
        raise


async def create_conversation(
    user_id: str,
    title: str | None,
    device_hint: str | None,
) -> ConversationItem:
    client = await get_supabase()
    try:
        data: dict[str, Any] = {
            "user_id": user_id,
            "title": title or "New Conversation",
        }
        if device_hint is not None:
            data["device_hint"] = device_hint
        result = await client.table("conversations").insert(data).execute()
        row: dict[str, Any] = cast(dict[str, Any], result.data[0])
        return ConversationItem(
            id=uuid.UUID(str(row["id"])),
            title=str(row.get("title", "")),
            device_hint=str(row["device_hint"]) if row.get("device_hint") else None,
            updated_at=str(row["updated_at"]),
        )
    except Exception as exc:
        logger.error(f"create_conversation failed for user {user_id}: {exc}")
        raise


async def get_messages_by_conversation(
    conversation_id: uuid.UUID,
    user_id: str,
) -> list[MessageItem]:
    client = await get_supabase()
    try:
        # Verify ownership
        conv_result = (
            await client.table("conversations")
            .select("id")
            .eq("id", str(conversation_id))
            .eq("user_id", user_id)
            .execute()
        )
        if not conv_result.data:
            return []
        result = (
            await client.table("messages")
            .select("*")
            .eq("conversation_id", str(conversation_id))
            .order("created_at", desc=False)
            .execute()
        )
        rows: list[dict[str, Any]] = cast(list[dict[str, Any]], result.data or [])
        return [_row_to_message(row) for row in rows]
    except Exception as exc:
        logger.error(
            f"get_messages_by_conversation failed for conv {conversation_id}: {exc}"
        )
        raise


async def delete_conversation(conversation_id: uuid.UUID, user_id: str) -> None:
    client = await get_supabase()
    try:
        await (
            client.table("conversations")
            .delete()
            .eq("id", str(conversation_id))
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        logger.error(
            f"delete_conversation failed for conv {conversation_id}: {exc}"
        )
        raise


async def add_message(
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    sources: list[SourceItem] | None,
) -> MessageItem:
    client = await get_supabase()
    try:
        data: dict[str, Any] = {
            "conversation_id": str(conversation_id),
            "role": role,
            "content": content,
        }
        if sources is not None:
            data["sources"] = [s.model_dump() for s in sources]
        result = await client.table("messages").insert(data).execute()
        row: dict[str, Any] = cast(dict[str, Any], result.data[0])
        return _row_to_message(row)
    except Exception as exc:
        logger.error(
            f"add_message failed for conv {conversation_id}: {exc}"
        )
        raise


async def get_recent_messages(
    conversation_id: uuid.UUID,
    user_id: str | None = None,
    limit: int = 8,
) -> list[MessageItem]:
    client = await get_supabase()
    try:
        if user_id:
            conv_check = (
                await client.table("conversations")
                .select("id")
                .eq("id", str(conversation_id))
                .eq("user_id", user_id)
                .execute()
            )
            if not conv_check.data:
                return []
        result = (
            await client.table("messages")
            .select("*")
            .eq("conversation_id", str(conversation_id))
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows: list[dict[str, Any]] = cast(list[dict[str, Any]], result.data or [])
        rows.reverse()
        return [_row_to_message(row) for row in rows]
    except Exception as exc:
        logger.error(
            f"get_recent_messages failed for conv {conversation_id}: {exc}"
        )
        raise


def _row_to_message(row: dict[str, Any]) -> MessageItem:
    raw_sources = row.get("sources")
    sources: list[SourceItem] | None = None
    if isinstance(raw_sources, list):
        sources = [SourceItem(**s) for s in raw_sources]
    return MessageItem(
        id=uuid.UUID(str(row["id"])),
        role=str(row["role"]),
        content=str(row["content"]),
        sources=sources,
        created_at=str(row["created_at"]),
    )
