from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from loguru import logger

from app.core.config import settings


def _require_youtube_key() -> str:
    if not settings.YOUTUBE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": "YouTube API key not configured", "code": "SERVICE_UNAVAILABLE"},
        )
    return settings.YOUTUBE_API_KEY


def _fetch_channel_videos_sync(channel_handle: str, api_key: str) -> list[dict[str, Any]]:
    """Synchronous core — runs inside asyncio.to_thread to avoid blocking the event loop.

    googleapiclient uses synchronous HTTP (.execute()); never call from async context directly.
    """
    import isodate
    import googleapiclient.discovery
    import googleapiclient.errors

    youtube = googleapiclient.discovery.build("youtube", "v3", developerKey=api_key)

    channels_response = (
        youtube.channels()
        .list(part="id,contentDetails", forHandle=channel_handle.lstrip("@"))
        .execute()
    )
    items = channels_response.get("items", [])
    if not items:
        logger.warning(f"Channel not found for handle: {channel_handle}")
        return []

    uploads_playlist_id: str = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

    videos: list[dict[str, Any]] = []
    page_token: str | None = None

    while True:
        playlist_response = (
            youtube.playlistItems()
            .list(
                part="snippet",
                playlistId=uploads_playlist_id,
                maxResults=50,
                pageToken=page_token,
            )
            .execute()
        )
        for item in playlist_response.get("items", []):
            snippet = item.get("snippet", {})
            video_id = snippet.get("resourceId", {}).get("videoId", "")
            if not video_id:
                continue
            published_at_str: str | None = snippet.get("publishedAt")
            published_at: datetime | None = None
            if published_at_str:
                try:
                    published_at = datetime.fromisoformat(
                        published_at_str.replace("Z", "+00:00")
                    )
                except ValueError:
                    pass
            videos.append(
                {
                    "video_id": video_id,
                    "title": snippet.get("title", ""),
                    "published_at": published_at,
                    "duration_sec": None,
                }
            )
        page_token = playlist_response.get("nextPageToken")
        if not page_token:
            break

    # Enrich with duration (also synchronous)
    batch_size = 50
    for i in range(0, len(videos), batch_size):
        batch = videos[i : i + batch_size]
        ids = ",".join(str(v["video_id"]) for v in batch)
        try:
            details = youtube.videos().list(part="contentDetails", id=ids).execute()
            duration_map: dict[str, int] = {}
            for detail_item in details.get("items", []):
                vid_id = detail_item.get("id", "")
                duration_str = detail_item.get("contentDetails", {}).get("duration", "PT0S")
                try:
                    duration_sec = int(isodate.parse_duration(duration_str).total_seconds())
                except Exception as exc:
                    logger.warning(f"isodate.parse_duration failed for '{duration_str}': {exc}")
                    duration_sec = 0
                duration_map[vid_id] = duration_sec
            for v in batch:
                v["duration_sec"] = duration_map.get(str(v["video_id"]))
        except Exception as exc:
            logger.warning(f"Failed to enrich durations for batch: {exc}")

    return videos


async def get_channel_videos(
    channel_handle: str = "@sv.developer",
) -> list[dict[str, Any]]:
    api_key = _require_youtube_key()
    try:
        return await asyncio.to_thread(_fetch_channel_videos_sync, channel_handle, api_key)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"get_channel_videos failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": f"YouTube API error: {exc}", "code": "YOUTUBE_ERROR"},
        ) from exc


def _yt_dlp_bin() -> str:
    """Return absolute path to yt-dlp executable inside the current venv (or system PATH fallback)."""
    venv_bin = Path(sys.executable).parent / ("yt-dlp.exe" if sys.platform == "win32" else "yt-dlp")
    if venv_bin.exists():
        return str(venv_bin)
    import shutil
    found = shutil.which("yt-dlp")
    return found if found else "yt-dlp"


def _subprocess_isolation_kwargs() -> dict[str, Any]:
    """Platform-specific kwargs to prevent CTRL+C from propagating to child process."""
    if sys.platform == "win32":
        return {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
    return {"start_new_session": True}


async def download_audio(video_id: str, output_dir: str) -> str:
    """Download YouTube audio using yt-dlp without ffmpeg post-processing.

    Downloads native audio (m4a/webm) — no ffmpeg required.
    Uses mweb player_client which works without PO tokens.
    Uses asyncio.to_thread for cross-platform compatibility (Windows SelectorEventLoop).
    Returns path to the downloaded audio file.
    """
    import glob as globmod

    output_template = os.path.join(output_dir, f"{video_id}.%(ext)s")
    url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        result: subprocess.CompletedProcess[bytes] = await asyncio.to_thread(
            subprocess.run,
            [
                _yt_dlp_bin(),
                "--format", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
                "--no-playlist",
                "--output", output_template,
                url,
            ],
            capture_output=True,
            timeout=600,
            **_subprocess_isolation_kwargs(),
        )
        if result.returncode != 0:
            err_msg = result.stderr.decode(errors="replace").strip()
            raise RuntimeError(f"yt-dlp failed (code {result.returncode}): {err_msg}")

        candidates = sorted(globmod.glob(os.path.join(output_dir, f"{video_id}.*")))
        if candidates:
            return candidates[0]
        raise RuntimeError(f"Downloaded file not found for {video_id}")

    except asyncio.CancelledError:
        raise
    except subprocess.TimeoutExpired as exc:
        logger.error(f"download_audio timed out for {video_id}: {exc!r}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": "Audio download timed out", "code": "DOWNLOAD_TIMEOUT"},
        ) from exc
    except FileNotFoundError as exc:
        logger.error(f"yt-dlp binary not found: {exc!r}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": "yt-dlp not installed", "code": "YTDLP_NOT_FOUND"},
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"download_audio failed for {video_id}: {exc!r}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": f"Audio download error: {exc}", "code": "DOWNLOAD_ERROR"},
        ) from exc
