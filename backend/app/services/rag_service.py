from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any

from fastapi import HTTPException, status
from loguru import logger
from openai import AsyncOpenAI, RateLimitError
from openai.types.chat import ChatCompletion
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.db.queries.conversations import (
    add_message,
    create_conversation,
    get_recent_messages,
)
from app.schemas.api import ChatResponse, SourceItem
from app.services import cache_service, embedding_service, pinecone_service, rerank_service

_SYSTEM_PROMPT = (
    "You are a helpful assistant that answers questions about the SV Developer YouTube channel. "
    "Use the provided video content context to answer accurately. "
    "Always cite your sources with timestamps. "
    "If the context doesn't contain relevant information, say so honestly."
)


def _get_openai_client() -> AsyncOpenAI:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": "OpenAI API key not configured", "code": "SERVICE_UNAVAILABLE"},
        )
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


def _normalize_query(query: str) -> str:
    return " ".join(query.lower().strip().split())


def _cache_key(query: str) -> str:
    normalized = _normalize_query(query)
    return "chat:" + hashlib.sha256(normalized.encode()).hexdigest()


def _generate_timestamp_url(video_id: str, seconds: float) -> str:
    return f"https://youtu.be/{video_id}?t={int(seconds)}"


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def _openai_chat(
    client: AsyncOpenAI,
    messages: list[dict[str, str]],
    tools: list[dict[str, Any]] | None = None,
) -> ChatCompletion:
    kwargs: dict[str, Any] = {
        "model": "gpt-4o",
        "messages": messages,
        "temperature": 0.2,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"
    result: ChatCompletion = await client.chat.completions.create(**kwargs)
    return result


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def _openai_rewrite(client: AsyncOpenAI, query: str) -> str:
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Rewrite the user query to be more specific and searchable. "
                    "Return only the rewritten query, nothing else."
                ),
            },
            {"role": "user", "content": query},
        ],
        temperature=0,
        max_tokens=200,
    )
    return response.choices[0].message.content or query


async def ask(
    query: str,
    conversation_id: uuid.UUID | None,
    user_id: str | None,
    include_history: bool = True,
) -> ChatResponse:
    # Check cache first
    cache_key = _cache_key(query)
    cached = await cache_service.get_cached(cache_key)
    if cached:
        try:
            data = json.loads(cached)
            return ChatResponse(**data)
        except Exception as exc:
            logger.warning(f"Cache parse error: {exc}")

    client = _get_openai_client()

    # Step 1: Query rewriting
    try:
        rewritten_query = await _openai_rewrite(client, query)
    except RateLimitError as exc:
        logger.error(f"OpenAI rate limit hit during rewrite: {exc}")
        rewritten_query = query
    except Exception as exc:
        logger.warning(f"Query rewrite failed: {exc}")
        rewritten_query = query

    # Step 2: Embedding + Pinecone top-10
    try:
        embedding = await embedding_service.embed_text(rewritten_query)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Embedding failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": f"Embedding error: {exc}", "code": "EMBEDDING_ERROR"},
        ) from exc

    matches = await pinecone_service.query_vectors(embedding, top_k=10)

    if not matches:
        logger.info("No Pinecone results — returning empty sources response")
        return ChatResponse(
            answer="I couldn't find relevant information in the video content for your query.",
            sources=[],
            confidence=0.0,
            conversation_id=conversation_id,
            cached=False,
        )

    # Step 3: Rerank top-5
    docs = [str(m.get("metadata", {}).get("text", "")) for m in matches]
    top_indices = await rerank_service.rerank(rewritten_query, docs, top_n=5)
    top_matches = [matches[i] for i in top_indices if i < len(matches)]

    # Step 4: Assemble context
    history_messages: list[dict[str, str]] = []
    if user_id and conversation_id and include_history:
        try:
            recent = await get_recent_messages(conversation_id, user_id=user_id, limit=8)
            for msg in recent[-8:]:  # up to 4 turns = 8 messages
                history_messages.append({"role": msg.role, "content": msg.content})
        except Exception as exc:
            logger.warning(f"Failed to load conversation history: {exc}")

    context_parts: list[str] = []
    for match in top_matches:
        meta = match.get("metadata", {})
        text = str(meta.get("text", ""))
        video_title = str(meta.get("video_title", "Unknown"))
        start_sec = float(meta.get("start_sec", 0))
        context_parts.append(
            f"[Video: {video_title}, Time: {int(start_sec)}s]\n{text}"
        )

    context_str = "\n\n---\n\n".join(context_parts)

    # Step 5: GPT-4o with Function Calling
    tools_def: list[dict[str, Any]] = [
        {
            "type": "function",
            "function": {
                "name": "search_video_content",
                "description": "Search for relevant video content",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "top_k": {"type": "integer", "default": 10},
                    },
                    "required": ["query"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_video_info",
                "description": "Get information about a specific video",
                "parameters": {
                    "type": "object",
                    "properties": {"video_id": {"type": "string"}},
                    "required": ["video_id"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "generate_timestamp_url",
                "description": "Generate a YouTube timestamp URL",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "video_id": {"type": "string"},
                        "seconds": {"type": "number"},
                    },
                    "required": ["video_id", "seconds"],
                },
            },
        },
    ]

    messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": f"{_SYSTEM_PROMPT}\n\nContext from videos:\n{context_str}",
        },
        *history_messages,
        {"role": "user", "content": query},
    ]

    try:
        response = await _openai_chat(client, messages, tools=tools_def)
    except RateLimitError as exc:
        logger.error(f"OpenAI rate limit: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": "OpenAI rate limit exceeded", "code": "RATE_LIMIT"},
        ) from exc
    except Exception as exc:
        logger.error(f"OpenAI chat failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": f"LLM error: {exc}", "code": "LLM_ERROR"},
        ) from exc

    choice = response.choices[0]
    answer_text = choice.message.content or ""

    # Handle tool calls
    if choice.message.tool_calls:
        for tool_call in choice.message.tool_calls:
            if not hasattr(tool_call, "function"):
                continue
            fn_name = tool_call.function.name
            if fn_name == "generate_timestamp_url":
                try:
                    args = json.loads(tool_call.function.arguments)
                    url = _generate_timestamp_url(
                        args["video_id"], float(args["seconds"])
                    )
                    logger.debug(f"Tool call generate_timestamp_url → {url}")
                except Exception as exc:
                    logger.warning(f"Tool call handling failed: {exc}")

    # Build sources
    sources: list[SourceItem] = []
    for match in top_matches:
        meta = match.get("metadata", {})
        video_id = str(meta.get("video_id", ""))
        video_title = str(meta.get("video_title", "Unknown"))
        start_sec = float(meta.get("start_sec", 0))
        end_sec = float(meta.get("end_sec", 0))
        excerpt = str(meta.get("text", ""))[:200]
        timestamp_label = _format_timestamp(start_sec, end_sec)
        timestamp_url = _generate_timestamp_url(video_id, start_sec) if video_id else ""
        sources.append(
            SourceItem(
                video_title=video_title,
                timestamp_label=timestamp_label,
                timestamp_url=timestamp_url,
                excerpt=excerpt,
            )
        )

    result = ChatResponse(
        answer=answer_text,
        sources=sources,
        confidence=_compute_confidence(top_matches),
        conversation_id=conversation_id,
        cached=False,
    )

    # Persist conversation if user authenticated
    if user_id:
        try:
            if conversation_id is None:
                conv = await create_conversation(user_id, title=query[:80], device_hint=None)
                result = ChatResponse(
                    answer=result.answer,
                    sources=result.sources,
                    confidence=result.confidence,
                    conversation_id=conv.id,
                    cached=False,
                )
                conversation_id = conv.id
            await add_message(conversation_id, "user", query, None)
            await add_message(conversation_id, "assistant", answer_text, sources)
        except Exception as exc:
            logger.warning(f"Failed to save conversation: {exc}")

    # Cache result
    try:
        await cache_service.set_cached(cache_key, result.model_dump_json(), ttl=3600)
    except Exception as exc:
        logger.warning(f"Failed to cache result: {exc}")

    return result


def _format_timestamp(start_sec: float, end_sec: float) -> str:
    def fmt(s: float) -> str:
        s = int(s)
        minutes, seconds = divmod(s, 60)
        hours, minutes = divmod(minutes, 60)
        if hours:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        return f"{minutes}:{seconds:02d}"

    return f"{fmt(start_sec)} - {fmt(end_sec)}"


def _compute_confidence(matches: list[dict[str, Any]]) -> float:
    if not matches:
        return 0.0
    scores = [float(m.get("score", 0)) for m in matches]
    avg = sum(scores) / len(scores)
    return round(min(max(avg, 0.0), 1.0), 4)
