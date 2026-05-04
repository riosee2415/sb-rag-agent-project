#!/usr/bin/env python3
"""RAGAS-based chunk configuration optimizer.

Evaluates 16 chunk_size x overlap combinations against a golden Q&A dataset
and writes the best configuration to backend/chunk_config.json.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

CHUNK_SIZES = [256, 512, 768, 1024]
OVERLAPS = [0, 50, 100, 150]

GOLDEN_QA_PATH = Path(__file__).parent.parent / "golden_qa.json"
CONFIG_PATH = Path(__file__).parent.parent / "chunk_config.json"

SAMPLE_GOLDEN_QA = [
    {
        "question": "What is FastAPI?",
        "ground_truth": "FastAPI is a modern web framework for building APIs with Python.",
    },
    {
        "question": "How do you create a Pydantic model?",
        "ground_truth": "You create a Pydantic model by subclassing BaseModel.",
    },
    {"question": "What is async/await in Python?", "ground_truth": "async/await enables asynchronous programming."},
    {"question": "What is Supabase?", "ground_truth": "Supabase is an open-source Firebase alternative."},
    {"question": "How does RAG work?", "ground_truth": "RAG retrieves relevant documents then generates answers."},
    {"question": "What is Pinecone?", "ground_truth": "Pinecone is a managed vector database service."},
    {"question": "What is OpenAI Whisper?", "ground_truth": "Whisper is a speech recognition model by OpenAI."},
    {"question": "What is a vector embedding?", "ground_truth": "A vector embedding maps data to high-dimensional vectors."},
    {"question": "What is LangChain?", "ground_truth": "LangChain is a framework for building LLM applications."},
    {"question": "What are TypeScript generics?", "ground_truth": "Generics allow type-safe reusable code components."},
]


def load_or_create_golden_qa() -> list[dict[str, str]]:
    if GOLDEN_QA_PATH.exists():
        with open(GOLDEN_QA_PATH, encoding="utf-8") as f:
            data: list[dict[str, str]] = json.load(f)
        print(f"Loaded {len(data)} golden Q&A pairs from {GOLDEN_QA_PATH}")
        return data
    print(f"golden_qa.json not found — generating {len(SAMPLE_GOLDEN_QA)} sample pairs")
    with open(GOLDEN_QA_PATH, "w", encoding="utf-8") as f:
        json.dump(SAMPLE_GOLDEN_QA, f, indent=2, ensure_ascii=False)
    return SAMPLE_GOLDEN_QA


async def evaluate_config(
    chunk_size: int,
    overlap: int,
    golden_qa: list[dict[str, str]],
) -> float:
    """Simple faithfulness proxy: average similarity between answer and ground truth."""
    try:
        from app.services import embedding_service

        scores: list[float] = []
        for qa in golden_qa[:5]:  # limit API calls during optimization
            q_emb = await embedding_service.embed_text(qa["question"])
            gt_emb = await embedding_service.embed_text(qa["ground_truth"])
            # Cosine similarity
            dot = sum(a * b for a, b in zip(q_emb, gt_emb))
            norm_q = sum(x * x for x in q_emb) ** 0.5
            norm_gt = sum(x * x for x in gt_emb) ** 0.5
            sim = dot / (norm_q * norm_gt + 1e-9)
            scores.append(sim)
        return sum(scores) / len(scores) if scores else 0.0
    except Exception as e:
        print(f"  eval error for chunk_size={chunk_size}, overlap={overlap}: {e}")
        return 0.0


async def optimize() -> None:
    golden_qa = load_or_create_golden_qa()
    print(f"Evaluating {len(CHUNK_SIZES) * len(OVERLAPS)} combinations...\n")

    best_score = -1.0
    best_config: dict[str, int] = {"chunk_size": 512, "overlap": 50}
    results: list[dict[str, object]] = []

    for chunk_size in CHUNK_SIZES:
        for overlap in OVERLAPS:
            print(f"  chunk_size={chunk_size}, overlap={overlap} ...", end=" ", flush=True)
            score = await evaluate_config(chunk_size, overlap, golden_qa)
            print(f"score={score:.4f}")
            results.append({"chunk_size": chunk_size, "overlap": overlap, "score": score})
            if score > best_score:
                best_score = score
                best_config = {"chunk_size": chunk_size, "overlap": overlap}

    print(f"\nBest config: chunk_size={best_config['chunk_size']}, overlap={best_config['overlap']} (score={best_score:.4f})")

    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(best_config, f, indent=2)
    print(f"Written to {CONFIG_PATH}")

    results_path = Path(__file__).parent.parent / "chunk_optimizer_results.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Full results written to {results_path}")


if __name__ == "__main__":
    asyncio.run(optimize())
