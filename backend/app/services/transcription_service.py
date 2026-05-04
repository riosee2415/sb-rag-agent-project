from __future__ import annotations

import asyncio
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import HTTPException, status
from loguru import logger
from openai import AsyncOpenAI

from app.core.config import settings

_TIMEOUT_SECONDS = 25 * 60  # 25 minutes
_MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB


def _get_client() -> AsyncOpenAI:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": "OpenAI API key not configured", "code": "SERVICE_UNAVAILABLE"},
        )
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def transcribe(audio_path: str) -> dict[str, object]:
    """Transcribe audio file using Whisper verbose_json format.

    Handles files > 25 MB by splitting with ffmpeg/pydub.
    """
    path = Path(audio_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    file_size = path.stat().st_size
    if file_size > _MAX_FILE_BYTES:
        logger.info(f"File {audio_path} is {file_size} bytes — splitting before transcription")
        return await _transcribe_large(audio_path)

    return await _transcribe_file(audio_path)


async def _transcribe_file(audio_path: str) -> dict[str, object]:
    client = _get_client()
    try:
        with open(audio_path, "rb") as f:
            result = await asyncio.wait_for(
                client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                    response_format="verbose_json",
                    timestamp_granularities=["word"],
                ),
                timeout=_TIMEOUT_SECONDS,
            )
        return result.model_dump()
    except TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": "Transcription timed out (25 min)", "code": "TRANSCRIPTION_TIMEOUT"},
        ) from None
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Transcription failed for {audio_path}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"detail": f"Transcription error: {exc}", "code": "TRANSCRIPTION_ERROR"},
        ) from exc


async def _transcribe_large(audio_path: str) -> dict[str, object]:
    """Split large audio into 20-min chunks and merge transcriptions."""
    segments: list[dict[str, object]] = []
    words: list[dict[str, object]] = []
    full_text_parts: list[str] = []

    with tempfile.TemporaryDirectory() as tmpdir:
        chunk_paths = await _split_audio(audio_path, tmpdir)
        for chunk_path in chunk_paths:
            try:
                chunk_result = await _transcribe_file(chunk_path)
                full_text_parts.append(str(chunk_result.get("text", "")))
                raw_segs = chunk_result.get("segments", [])
                if isinstance(raw_segs, list):
                    segments.extend(raw_segs)
                raw_words = chunk_result.get("words", [])
                if isinstance(raw_words, list):
                    words.extend(raw_words)
            except Exception as exc:
                logger.error(f"Failed to transcribe chunk {chunk_path}: {exc}")

    return {
        "text": " ".join(full_text_parts),
        "segments": segments,
        "words": words,
    }


def _get_ffmpeg_bin() -> str:
    """Return path to ffmpeg: bundled imageio_ffmpeg > system PATH."""
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


async def _split_audio(audio_path: str, output_dir: str) -> list[str]:
    """Split audio into 20-minute chunks using ffmpeg or pydub fallback.

    Uses asyncio.to_thread for cross-platform compatibility (Windows SelectorEventLoop).
    """
    chunk_duration = 1200  # 20 minutes in seconds

    # Try ffmpeg via thread (no asyncio subprocess — works on all platforms)
    ffmpeg_bin = _get_ffmpeg_bin()
    logger.debug(f"_split_audio: audio={audio_path} output_dir={output_dir} ffmpeg={ffmpeg_bin}")
    try:
        pattern = os.path.join(output_dir, "chunk_%03d.m4a")
        logger.debug(f"_split_audio: running ffmpeg with pattern={pattern}")
        _isolation: dict[str, object] = (
            {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
            if sys.platform == "win32"
            else {"start_new_session": True}
        )
        ffmpeg_result: subprocess.CompletedProcess[bytes] = await asyncio.to_thread(
            subprocess.run,
            [
                ffmpeg_bin,
                "-i", audio_path,
                "-f", "segment",
                "-segment_time", str(chunk_duration),
                "-c", "copy",
                pattern,
            ],
            capture_output=True,
            timeout=300,
            **_isolation,
        )
        logger.debug(f"_split_audio: ffmpeg returned {ffmpeg_result.returncode}")
        if ffmpeg_result.returncode == 0:
            chunks = sorted(Path(output_dir).glob("chunk_*.m4a"))
            logger.debug(f"_split_audio: found {len(chunks)} chunks")
            if chunks:
                return [str(c) for c in chunks]
            logger.warning("_split_audio: ffmpeg succeeded but no chunk_*.m4a found — trying pydub")
        else:
            err = ffmpeg_result.stderr.decode(errors="replace")
            logger.warning(f"ffmpeg split failed (returncode={ffmpeg_result.returncode}): {err[:300]} — trying pydub")
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        logger.warning(f"ffmpeg split failed: {exc} — trying pydub")

    # Pydub fallback
    try:
        from pydub import AudioSegment

        audio = AudioSegment.from_file(audio_path)
        chunk_ms = chunk_duration * 1000
        chunk_paths: list[str] = []
        for i, start in enumerate(range(0, len(audio), chunk_ms)):
            chunk = audio[start : start + chunk_ms]
            chunk_path = os.path.join(output_dir, f"chunk_{i:03d}.mp3")
            chunk.export(chunk_path, format="mp3")
            chunk_paths.append(chunk_path)
        return chunk_paths
    except ImportError:
        logger.error("Neither ffmpeg nor pydub available for audio splitting")
        return [audio_path]
    except Exception as exc:
        logger.error(f"pydub split failed: {exc}")
        return [audio_path]
