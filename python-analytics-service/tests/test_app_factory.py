import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.main import create_app
from main import app


class AppFactoryTests(unittest.TestCase):
    def test_create_app_produces_independent_service_state(self):
        first = create_app()
        second = create_app()

        self.assertIsNot(first, second)
        self.assertIsNot(first.state.analytics_service, second.state.analytics_service)
        self.assertIsNot(first.state.quality_service, second.state.quality_service)
        self.assertIsNot(first.state.pivot_service, second.state.pivot_service)
        self.assertIs(
            first.state.analytics_service.etl_processor,
            first.state.quality_service.etl_processor,
        )

    def test_legacy_main_app_still_serves_health_route(self):
        with TestClient(app) as client:
            response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")


if __name__ == "__main__":
    unittest.main()
