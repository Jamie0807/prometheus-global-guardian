"""提供分析请求的统一内部错误响应。"""

import logging
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.responses import build_error_response


logger = logging.getLogger(__name__)


def analysis_internal_error(request: Request) -> JSONResponse:
    logger.error("analysis.request_failed", extra={"request_id": request.state.request_id})
    return build_error_response(
        request,
        status_code=500,
        code="ANALYTICS_INTERNAL_ERROR",
        message="Analysis service failed to process the request.",
    )


async def validation_error_response(
    request: Request, _: RequestValidationError
) -> JSONResponse:
    """把 Pydantic 校验错误转换为不泄露字段细节的错误信封。"""

    return build_error_response(
        request,
        status_code=422,
        code="ANALYTICS_VALIDATION_ERROR",
        message="Analytics request validation failed.",
    )
