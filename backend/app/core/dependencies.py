from __future__ import annotations

from typing import Annotated

import httpx
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from loguru import logger

from app.core.config import settings

security = HTTPBearer(auto_error=False)

# JWKS keys fetched at startup — supports RS256 (new Supabase projects)
_jwks_keys: list[dict] = []


async def load_jwks() -> None:
    global _jwks_keys
    if not settings.SUPABASE_URL:
        logger.warning("SUPABASE_URL not set — skipping JWKS load")
        return
    url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            _jwks_keys = resp.json().get("keys", [])
            logger.info(f"JWKS loaded: {len(_jwks_keys)} key(s)")
    except Exception as exc:
        logger.warning(f"JWKS load failed (RS256 auth disabled): {exc}")


async def verify_api_secret(
    x_api_secret: Annotated[str | None, Header(alias="X-API-Secret")] = None,
) -> None:
    if not x_api_secret or x_api_secret != settings.API_SHARED_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"detail": "Invalid or missing API secret", "code": "INVALID_API_SECRET"},
        )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None,
) -> dict[str, str] | None:
    if credentials is None:
        return None
    token = credentials.credentials

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
        kid = header.get("kid")
    except JWTError as exc:
        logger.warning(f"JWT header parse failed: {exc}")
        return None

    try:
        if alg == "HS256":
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        else:
            # RS256 or other asymmetric alg — use JWKS public key
            key = next(
                (k for k in _jwks_keys if not kid or k.get("kid") == kid),
                _jwks_keys[0] if _jwks_keys else None,
            )
            if key is None:
                logger.warning("JWT verification failed: no JWKS key available for RS256")
                return None
            payload = jwt.decode(
                token,
                key,
                algorithms=[alg],
                options={"verify_aud": False},
            )

        user_id: str = payload.get("sub", "")
        if not user_id:
            return None
        return {"user_id": user_id}
    except JWTError as exc:
        logger.warning(f"JWT verification failed: {exc}")
        return None


async def require_user(
    user: Annotated[dict[str, str] | None, Depends(get_current_user)] = None,
) -> dict[str, str]:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Authentication required", "code": "AUTH_REQUIRED"},
        )
    return user
