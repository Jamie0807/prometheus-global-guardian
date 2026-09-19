"""为 HTTP 请求附加可追踪的请求标识。"""

import uuid
import re

from fastapi import Request, Response
from starlette.middleware.base import RequestResponseEndpoint


REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


async def attach_request_id(request: Request, call_next: RequestResponseEndpoint) -> Response:
    candidate = request.headers.get("X-Request-Id", "")
    request_id = candidate if REQUEST_ID_PATTERN.fullmatch(candidate) else str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response
