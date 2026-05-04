from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.dependencies import get_current_user, verify_api_secret
from app.db.queries.videos import get_all_videos
from app.schemas.api import ChatRequest, ChatResponse, VideosResponse
from app.services import rag_service

router = APIRouter(prefix="/api/v1", dependencies=[Depends(verify_api_secret)])
_limiter = Limiter(key_func=get_remote_address)


@router.post("/chat", response_model=ChatResponse, status_code=200)
@_limiter.limit("20/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    user: Annotated[dict[str, str] | None, Depends(get_current_user)] = None,
) -> ChatResponse:
    user_id: str | None = user["user_id"] if user is not None else None
    return await rag_service.ask(
        query=body.query,
        conversation_id=body.conversation_id,
        user_id=user_id,
        include_history=body.include_history,
    )


@router.post("/videos", response_model=VideosResponse, status_code=200)
async def list_videos() -> VideosResponse:
    videos = await get_all_videos()
    return VideosResponse(videos=videos, total=len(videos))
