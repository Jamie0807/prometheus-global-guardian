"""提供分析请求的统一内部错误响应。"""

import logging
from typing import NoReturn

from fastapi import HTTPException, Request


logger = logging.getLogger(__name__)


def raise_analysis_internal_error(request: Request) -> NoReturn:
    logger.error("analysis.request_failed", extra={"request_id": request.state.request_id})
    raise HTTPException(
        status_code=500,
        detail={
            "code": "ANALYSIS_INTERNAL_ERROR",
            "message": "Analysis service failed to process the request.",
            "requestId": request.state.request_id,
        },
    )
