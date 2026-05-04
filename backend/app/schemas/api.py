from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field


class SourceItem(BaseModel):
    video_title: str
    timestamp_label: str
    timestamp_url: str
    excerpt: str


class VideoItem(BaseModel):
    video_id: str
    title: str
    duration_sec: int | None = None
    published_at: datetime | None = None
    status: str


class ConversationItem(BaseModel):
    id: uuid.UUID
    title: str
    device_hint: str | None = None
    updated_at: datetime


class MessageItem(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    sources: list[SourceItem] | None = None
    created_at: datetime


# Request models
class ChatRequest(BaseModel):
    query: Annotated[str, Field(min_length=1)]
    conversation_id: uuid.UUID | None = None
    include_history: bool = True


class ConversationCreateRequest(BaseModel):
    title: str | None = None
    device_hint: str | None = None


# Response models
class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    confidence: float
    conversation_id: uuid.UUID | None = None
    cached: bool


# Alias used by rag_service
RAGResponse = ChatResponse


class VideosResponse(BaseModel):
    videos: list[VideoItem]
    total: int


class IngestResponse(BaseModel):
    job_id: str
    status: str


class StatusResponse(BaseModel):
    total_videos: int
    done: int
    pending: int
    error: int
    last_updated: datetime | None = None


class ConversationsListResponse(BaseModel):
    conversations: list[ConversationItem]


# Alias used in API contract
ConversationListResponse = ConversationsListResponse


class ConversationCreate(BaseModel):
    title: str = "새 대화"
    device_hint: str | None = None


class ConversationMessagesResponse(BaseModel):
    messages: list[MessageItem]


# Alias used in API contract
MessagesResponse = ConversationMessagesResponse


class HealthResponse(BaseModel):
    status: str


class ErrorResponse(BaseModel):
    detail: str
    code: str
