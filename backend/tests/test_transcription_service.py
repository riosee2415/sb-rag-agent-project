from __future__ import annotations

import subprocess
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException


def test_get_client_raises_503_when_no_api_key() -> None:
    from app.services.transcription_service import _get_client

    with patch("app.services.transcription_service.settings") as mock_settings:
        mock_settings.OPENAI_API_KEY = ""
        with pytest.raises(HTTPException) as exc_info:
            _get_client()

    assert exc_info.value.status_code == 503


async def test_transcribe_raises_file_not_found() -> None:
    from app.services.transcription_service import transcribe

    with pytest.raises(FileNotFoundError):
        await transcribe("/nonexistent/path/audio.mp3")


# ---------------------------------------------------------------------------
# _split_audio — cross-platform (asyncio.to_thread, no create_subprocess_exec)
# ---------------------------------------------------------------------------


async def test_split_audio_uses_to_thread_not_create_subprocess(tmp_path: Any) -> None:
    """_split_audio must use asyncio.to_thread, not create_subprocess_exec."""
    audio_path = str(tmp_path / "audio.m4a")
    (tmp_path / "audio.m4a").write_bytes(b"fake")

    ffmpeg_ok = MagicMock(spec=subprocess.CompletedProcess)
    ffmpeg_ok.returncode = 0
    chunk_file = tmp_path / "chunk_000.mp3"
    chunk_file.write_bytes(b"chunk data")

    with patch("asyncio.to_thread", new=AsyncMock(return_value=ffmpeg_ok)) as mock_thread:
        with patch("asyncio.create_subprocess_exec") as mock_exec:
            from app.services import transcription_service
            import importlib
            importlib.reload(transcription_service)
            await transcription_service._split_audio(audio_path, str(tmp_path))
            mock_exec.assert_not_called()
            mock_thread.assert_called()


async def test_split_audio_falls_back_to_source_when_no_ffmpeg_no_pydub(tmp_path: Any) -> None:
    """Returns [audio_path] when ffmpeg and pydub both unavailable."""
    audio_path = str(tmp_path / "audio.m4a")
    (tmp_path / "audio.m4a").write_bytes(b"fake")

    with patch("asyncio.to_thread", new=AsyncMock(side_effect=FileNotFoundError("ffmpeg not found"))):
        with patch.dict("sys.modules", {"pydub": None}):
            from app.services import transcription_service
            import importlib
            importlib.reload(transcription_service)
            result = await transcription_service._split_audio(audio_path, str(tmp_path))

    assert result == [audio_path]
