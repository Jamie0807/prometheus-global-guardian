import uuid

from fastapi import Request, Response
from starlette.middleware.base import RequestResponseEndpoint


async def attach_request_id(request: Request, call_next: RequestResponseEndpoint) -> Response:
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response
