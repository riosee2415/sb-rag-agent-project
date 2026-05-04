from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from loguru import logger

_DEFAULT_CHUNK_CONFIG: dict[str, int] = {
    "chunk_size": 512,
    "overlap": 50,
}

# OpenAI text-embedding-3-small hard limit
_MAX_EMBED_TOKENS = 8191

_CONFIG_PATH = Path(__file__).parent.parent.parent / "chunk_config.json"


def load_chunk_config() -> dict[str, int]:
    if _CONFIG_PATH.exists():
        try:
            with open(_CONFIG_PATH, encoding="utf-8") as f:
                data: dict[str, int] = json.load(f)
            return data
        except Exception as exc:
            logger.warning(f"Failed to load chunk_config.json, using defaults: {exc}")
    return _DEFAULT_CHUNK_CONFIG.copy()


def chunk_text(
    text: str,
    timestamps: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Split text into chunks respecting sentence boundaries.

    Args:
        text: Full transcript text.
        timestamps: List of {word/text, start, end} dicts from Whisper.

    Returns:
        List of {text, start_sec, end_sec, chunk_index} dicts.
    """
    config = load_chunk_config()
    chunk_size: int = config.get("chunk_size", 512)
    overlap: int = config.get("overlap", 50)

    # Attempt sentence splitting with kss
    sentences: list[str] = _split_sentences(text)

    # Try to get token counts using tiktoken
    _enc: object = None
    try:
        import tiktoken

        _enc = tiktoken.get_encoding("cl100k_base")

        def token_len(s: str) -> int:
            return len(_enc.encode(s))  # type: ignore[union-attr]

        def truncate_chunk(s: str) -> str:
            tokens = _enc.encode(s)  # type: ignore[union-attr]
            if len(tokens) > _MAX_EMBED_TOKENS:
                return _enc.decode(tokens[:_MAX_EMBED_TOKENS])  # type: ignore[union-attr]
            return s

    except ImportError:
        logger.warning("tiktoken not installed — using word count approximation")

        def token_len(s: str) -> int:
            return len(s.split())

        def truncate_chunk(s: str) -> str:
            words = s.split()
            return " ".join(words[:_MAX_EMBED_TOKENS]) if len(words) > _MAX_EMBED_TOKENS else s

    chunks: list[dict[str, Any]] = []
    chunk_index = 0
    current_sentences: list[str] = []
    current_tokens = 0

    for sentence in sentences:
        s_tokens = token_len(sentence)
        if current_tokens + s_tokens > chunk_size and current_sentences:
            chunk_text_str = truncate_chunk(" ".join(current_sentences))
            start_sec, end_sec = _find_timestamp_range(chunk_text_str, timestamps)
            chunks.append(
                {
                    "text": chunk_text_str,
                    "start_sec": start_sec,
                    "end_sec": end_sec,
                    "chunk_index": chunk_index,
                }
            )
            chunk_index += 1
            # Overlap: keep last overlap-sized portion of tokens
            if overlap > 0:
                overlap_sentences: list[str] = []
                overlap_tokens = 0
                for s in reversed(current_sentences):
                    st = token_len(s)
                    if overlap_tokens + st > overlap:
                        break
                    overlap_sentences.insert(0, s)
                    overlap_tokens += st
                current_sentences = overlap_sentences
                current_tokens = overlap_tokens
            else:
                current_sentences = []
                current_tokens = 0
        current_sentences.append(sentence)
        current_tokens += s_tokens

    if current_sentences:
        chunk_text_str = truncate_chunk(" ".join(current_sentences))
        start_sec, end_sec = _find_timestamp_range(chunk_text_str, timestamps)
        chunks.append(
            {
                "text": chunk_text_str,
                "start_sec": start_sec,
                "end_sec": end_sec,
                "chunk_index": chunk_index,
            }
        )

    return chunks


def _split_sentences(text: str) -> list[str]:
    try:
        import kss

        # punct backend: punctuation-based heuristic, no morphological analysis (fast)
        result: list[str] = list(kss.split_sentences(text, backend="punct"))
        return result
    except ImportError:
        logger.warning("kss not installed — using period-based sentence splitting")
        raw = [s.strip() for s in text.replace("\n", " ").split(". ") if s.strip()]
        return raw if raw else [text]


def _find_timestamp_range(
    chunk_text: str,
    timestamps: list[dict[str, Any]],
) -> tuple[float, float]:
    if not timestamps:
        return 0.0, 0.0
    first_word = chunk_text.split()[0].lower().strip(".,!?") if chunk_text.split() else ""
    last_word = chunk_text.split()[-1].lower().strip(".,!?") if chunk_text.split() else ""
    start_sec: float = 0.0
    end_sec: float = 0.0
    found_start = False
    for ts in timestamps:
        word = str(ts.get("word", ts.get("text", ""))).lower().strip(".,!?")
        ts_start = float(ts.get("start", 0.0))
        ts_end = float(ts.get("end", 0.0))
        if not found_start and word and first_word and first_word in word:
            start_sec = ts_start
            found_start = True
        if word and last_word and last_word in word:
            end_sec = ts_end
    if not found_start and timestamps:
        start_sec = float(timestamps[0].get("start", 0.0))
    if end_sec == 0.0 and timestamps:
        end_sec = float(timestamps[-1].get("end", 0.0))
    return start_sec, end_sec
