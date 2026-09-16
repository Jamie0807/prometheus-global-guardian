"""定义数据分析服务管理面的安全边界。"""

import os
import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException


DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
)


def get_cors_origins() -> list[str]:
    configured_origins = os.environ.get("ANALYTICS_CORS_ORIGINS", "")
    origins = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
    return origins or list(DEFAULT_CORS_ORIGINS)


def require_admin_access(
    admin_token: Annotated[
        str | None, Header(alias="X-Analytics-Admin-Token")
    ] = None,
) -> None:
    expected_token = os.environ.get("ANALYTICS_ADMIN_TOKEN", "")
    if not expected_token or not admin_token:
        raise HTTPException(status_code=404, detail="Not Found")

    if not secrets.compare_digest(admin_token, expected_token):
        raise HTTPException(status_code=404, detail="Not Found")


AdminAccess = Annotated[None, Depends(require_admin_access)]
