from __future__ import annotations

from loguru import logger
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=False,
)
async def rerank(query: str, docs: list[str], top_n: int = 5) -> list[int]:
    if not settings.COHERE_API_KEY:
        logger.warning("COHERE_API_KEY not set — using top-N passthrough for reranking")
        return list(range(min(top_n, len(docs))))
    try:
        import cohere

        co = cohere.AsyncClient(api_key=settings.COHERE_API_KEY)
        response = await co.rerank(
            model="rerank-multilingual-v3.0",
            query=query,
            documents=docs,
            top_n=top_n,
        )
        return [result.index for result in response.results]
    except ImportError:
        logger.warning("cohere package not installed — using top-N passthrough")
        return list(range(min(top_n, len(docs))))
    except Exception as exc:
        logger.error(f"rerank failed: {exc}")
        return list(range(min(top_n, len(docs))))
