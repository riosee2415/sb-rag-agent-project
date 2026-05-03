from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

security = HTTPBearer(auto_error=False)


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
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub", "")
        if not user_id:
            return None
        return {"user_id": user_id}
    except JWTError:
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
