from fastapi import FastAPI

from app.services.analytics_service import AnalyticsService
from app.services.pivot_service import PivotService
from app.services.quality_service import QualityService


def configure_application_state(application: FastAPI) -> None:
    analytics_service = AnalyticsService()
    application.state.analytics_service = analytics_service
    application.state.quality_service = QualityService(analytics_service.etl_processor)
    application.state.pivot_service = PivotService()
