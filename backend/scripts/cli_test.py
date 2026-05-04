#!/usr/bin/env python3
"""CLI tool for testing RAG queries against the running backend."""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import uuid
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent.parent))


async def run_query(query: str, conversation_id: str | None) -> None:
    from app.services import rag_service

    conv_id: uuid.UUID | None = None
    if conversation_id:
        try:
            conv_id = uuid.UUID(conversation_id)
        except ValueError:
            print(f"Error: invalid UUID '{conversation_id}'", file=sys.stderr)
            sys.exit(1)

    result = await rag_service.ask(
        query=query,
        conversation_id=conv_id,
        user_id=None,
        include_history=False,
    )

    print(json.dumps(result.model_dump(), indent=2, default=str))


def main() -> None:
    parser = argparse.ArgumentParser(description="CLI RAG query tester")
    parser.add_argument("--query", "-q", required=True, help="Query string")
    parser.add_argument(
        "--conversation-id",
        "-c",
        default=None,
        help="Optional conversation UUID to continue",
    )
    args = parser.parse_args()
    asyncio.run(run_query(args.query, args.conversation_id))


if __name__ == "__main__":
    main()
