from __future__ import annotations

import subprocess
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

# ---------------------------------------------------------------------------
# _require_youtube_key
# ---------------------------------------------------------------------------


def test_require_youtube_key_raises_503_when_missing() -> None:
    with patch("app.services.youtube_service.settings") as mock_settings:
        mock_settings.YOUTUBE_API_KEY = ""
        from app.services.youtube_service import _require_youtube_key

        with pytest.raises(HTTPException) as exc_info:
            _require_youtube_key()

    assert exc_info.value.status_code == 503


def test_require_youtube_key_returns_key_when_set() -> None:
    with patch("app.services.youtube_service.settings") as mock_settings:
        mock_settings.YOUTUBE_API_KEY = "yt-key-123"
        from app.services.youtube_service import _require_youtube_key

        key = _require_youtube_key()

    assert key == "yt-key-123"


# ---------------------------------------------------------------------------
# get_channel_videos
# ---------------------------------------------------------------------------


async def test_get_channel_videos_raises_when_no_api_key() -> None:
    with patch("app.services.youtube_service.settings") as mock_settings:
        mock_settings.YOUTUBE_API_KEY = ""
        from app.services.youtube_service import get_channel_videos

        with pytest.raises(HTTPException) as exc_info:
            await get_channel_videos()

    assert exc_info.value.status_code == 503


async def test_get_channel_videos_returns_empty_when_channel_not_found() -> None:
    channels_resp: dict[str, Any] = {"items": []}

    mock_youtube = MagicMock()
    mock_youtube.channels.return_value.list.return_value.execute.return_value = channels_resp

    mock_build = MagicMock(return_value=mock_youtube)
    mock_googleapi = MagicMock()
    mock_googleapi.discovery.build = mock_build

    with patch("app.services.youtube_service.settings") as mock_settings:
        mock_settings.YOUTUBE_API_KEY = "yt-key"
        with patch.dict(
            "sys.modules",
            {
                "googleapiclient": mock_googleapi,
                "googleapiclient.discovery": mock_googleapi.discovery,
                "googleapiclient.errors": MagicMock(),
            },
        ):
            import importlib

            from app.services import youtube_service

            importlib.reload(youtube_service)
            with patch("app.services.youtube_service.settings") as ms2:
                ms2.YOUTUBE_API_KEY = "yt-key"
                result = await youtube_service.get_channel_videos()

    assert result == []


async def test_get_channel_videos_raises_503_on_api_exception() -> None:
    mock_youtube = MagicMock()
    mock_youtube.channels.return_value.list.return_value.execute.side_effect = RuntimeError("quota")

    mock_googleapi = MagicMock()
    mock_googleapi.discovery.build = MagicMock(return_value=mock_youtube)

    with patch("app.services.youtube_service.settings") as mock_settings:
        mock_settings.YOUTUBE_API_KEY = "yt-key"
        with patch.dict(
            "sys.modules",
            {
                "googleapiclient": mock_googleapi,
                "googleapiclient.discovery": mock_googleapi.discovery,
                "googleapiclient.errors": MagicMock(),
            },
        ):
            import importlib

            from app.services import youtube_service

            importlib.reload(youtube_service)
            with patch("app.services.youtube_service.settings") as ms2:
                ms2.YOUTUBE_API_KEY = "yt-key"
                with pytest.raises(HTTPException) as exc_info:
                    await youtube_service.get_channel_videos()

    assert exc_info.value.status_code == 503


# ---------------------------------------------------------------------------
# download_audio
# ---------------------------------------------------------------------------


def _make_proc_result(returncode: int, stderr: bytes = b"") -> MagicMock:
    r = MagicMock(spec=subprocess.CompletedProcess)
    r.returncode = returncode
    r.stderr = stderr
    return r


async def test_download_audio_raises_503_when_yt_dlp_not_found() -> None:
    with patch("asyncio.to_thread", new=AsyncMock(side_effect=FileNotFoundError("yt-dlp not found"))):
        from app.services.youtube_service import download_audio

        with pytest.raises(HTTPException) as exc_info:
            await download_audio("vid1", "/tmp")

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail["code"] == "YTDLP_NOT_FOUND"  # type: ignore[index]


async def test_download_audio_raises_503_on_nonzero_exit(tmp_path: Any) -> None:
    mock_result = _make_proc_result(returncode=1, stderr=b"yt-dlp error output")

    with patch("asyncio.to_thread", new=AsyncMock(return_value=mock_result)):
        from app.services.youtube_service import download_audio

        with pytest.raises(HTTPException) as exc_info:
            await download_audio("vid1", str(tmp_path))

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail["code"] == "DOWNLOAD_ERROR"  # type: ignore[index]


async def test_download_audio_returns_m4a_path_on_success(tmp_path: Any) -> None:
    video_id = "vid1"
    m4a_path = tmp_path / f"{video_id}.m4a"
    m4a_path.write_bytes(b"fake m4a data")

    mock_result = _make_proc_result(returncode=0)

    with patch("asyncio.to_thread", new=AsyncMock(return_value=mock_result)):
        from app.services.youtube_service import download_audio

        result = await download_audio(video_id, str(tmp_path))

    assert result == str(m4a_path)


async def test_download_audio_returns_mp3_path_on_success(tmp_path: Any) -> None:
    video_id = "vid1"
    mp3_path = tmp_path / f"{video_id}.mp3"
    mp3_path.write_bytes(b"fake mp3 data")

    mock_result = _make_proc_result(returncode=0)

    with patch("asyncio.to_thread", new=AsyncMock(return_value=mock_result)):
        from app.services.youtube_service import download_audio

        result = await download_audio(video_id, str(tmp_path))

    assert result == str(mp3_path)


async def test_download_audio_uses_glob_fallback(tmp_path: Any) -> None:
    """yt-dlp may produce webm/opus — glob finds any extension."""
    video_id = "vid1"
    webm_path = tmp_path / f"{video_id}.webm"
    webm_path.write_bytes(b"fake webm data")

    mock_result = _make_proc_result(returncode=0)

    with patch("asyncio.to_thread", new=AsyncMock(return_value=mock_result)):
        from app.services.youtube_service import download_audio

        result = await download_audio(video_id, str(tmp_path))

    assert video_id in result


async def test_download_audio_raises_when_no_file_found(tmp_path: Any) -> None:
    video_id = "vid_no_file"
    mock_result = _make_proc_result(returncode=0)

    with patch("asyncio.to_thread", new=AsyncMock(return_value=mock_result)):
        from app.services.youtube_service import download_audio

        with pytest.raises(HTTPException) as exc_info:
            await download_audio(video_id, str(tmp_path))

    assert exc_info.value.status_code == 503


async def test_download_audio_raises_503_on_timeout(tmp_path: Any) -> None:
    with patch("asyncio.to_thread", new=AsyncMock(side_effect=subprocess.TimeoutExpired(cmd="yt-dlp", timeout=600))):
        from app.services.youtube_service import download_audio

        with pytest.raises(HTTPException) as exc_info:
            await download_audio("vid1", str(tmp_path))

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail["code"] == "DOWNLOAD_TIMEOUT"  # type: ignore[index]


async def test_download_audio_propagates_cancelled_error(tmp_path: Any) -> None:
    import asyncio as _asyncio

    with patch("asyncio.to_thread", new=AsyncMock(side_effect=_asyncio.CancelledError())):
        from app.services.youtube_service import download_audio

        with pytest.raises(_asyncio.CancelledError):
            await download_audio("vid1", str(tmp_path))
