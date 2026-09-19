"""创建并装配数据分析 FastAPI 应用。"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.errors import validation_error_response
from app.core.middleware import attach_request_id
from app.core.state import configure_application_state
from app.routes.analytics import router as analytics_router
from app.routes.health import router as health_router
from app.routes.pivot import router as pivot_router
from app.routes.quality import router as quality_router
from log_config import configure_logging
from security import get_cors_origins


def create_app() -> FastAPI:
    configure_logging()
    application = FastAPI(
        title="Prometheus Analytics Service",
        description="Python-powered data analytics microservice for hazard monitoring",
        version="1.0.0",
    )
    configure_application_state(application)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Analytics-Admin-Token", "X-Request-Id"],
        expose_headers=["X-Request-Id"],
    )
    application.add_exception_handler(RequestValidationError, validation_error_response)
    application.middleware("http")(attach_request_id)
    application.include_router(health_router)
    application.include_router(analytics_router)
    application.include_router(quality_router)
    application.include_router(pivot_router)
    return application
