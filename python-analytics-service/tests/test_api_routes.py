"""验证数据分析 API 路由的响应和错误处理。"""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.main import create_app
from app.schemas.responses import AnalysisResponse
import security


HAZARD = {
    "id": "hazard-1", "type": "EARTHQUAKE", "title": "Example event",
    "coordinates": [116.4, 39.9], "timestamp": "2026-09-03T00:00:00.000Z",
    "magnitude": 4.5, "severity": "WARNING", "source": "USGS", "populationExposed": 1000,
}


class ApiRouteTests(unittest.TestCase):
    def setUp(self):
        self.service_token = "test-analytics-service-token"
        self.service_token_environment = patch.dict(
            os.environ, {"ANALYTICS_SERVICE_TOKEN": self.service_token}
        )
        self.service_token_environment.start()
        self.addCleanup(self.service_token_environment.stop)
        self.app = create_app()
        self.client = TestClient(
            self.app,
            headers={"X-Analytics-Service-Token": self.service_token},
        )

    def tearDown(self):
        self.client.close()

    def test_service_info_describes_statistical_analysis_without_algorithm_count(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("Statistical Analysis", response.json()["features"])
        self.assertNotIn("23 Statistical Algorithms", response.json()["features"])

    def test_analysis_routes_reject_missing_or_invalid_service_tokens(self):
        with TestClient(self.app) as client:
            payload = {"hazards": [HAZARD]}
            missing_token = client.post("/api/v1/statistics", json=payload)
            invalid_token = client.post(
                "/api/v1/statistics",
                json=payload,
                headers={"X-Analytics-Service-Token": "incorrect-test-token"},
            )

        self.assertEqual(missing_token.status_code, 404)
        self.assertEqual(invalid_token.status_code, 404)

    def test_primary_routes_delegate_to_application_analytics_service(self):
        routes = {
            "/api/v1/analyze": ("comprehensive_analysis", AnalysisResponse(success=True, data={"processingInfo": {"totalRecords": 1}}, processingTime=0.0, timestamp="2026-09-10T00:00:00")),
            "/api/v1/statistics": ("statistics", {"summary": "statistics"}),
            "/api/v1/predictions": ("predictions", {"summary": "predictions"}),
            "/api/v1/etl/process": ("etl", {"recordsProcessed": 1}),
            "/api/v1/risk-assessment": ("risk_assessment", {"risk": "low"}),
        }
        for path, (method, result) in routes.items():
            with self.subTest(path=path), patch.object(
                self.app.state.analytics_service, method, new=AsyncMock(return_value=result)
            ) as service_method:
                response = self.client.post(path, json={"hazards": [HAZARD]})
            self.assertEqual(response.status_code, 200)
            service_method.assert_awaited_once()

    def test_core_analysis_routes_return_success_envelopes_for_representative_hazard(self):
        for path in ["/api/v1/statistics", "/api/v1/predictions", "/api/v1/risk-assessment"]:
            with self.subTest(path=path):
                response = self.client.post(
                    path,
                    json={"hazards": [HAZARD]},
                    headers={"X-Request-Id": "route-request-id"},
                )
                self.assertEqual(response.status_code, 200)
                body = response.json()
                self.assertIs(body["success"], True)
                self.assertIn("data", body)
                self.assertEqual(body["schemaVersion"], "1.0")
                self.assertEqual(body["requestId"], "route-request-id")
                self.assertEqual(body["modelVersion"], "analytics-model-v1")
                self.assertEqual(body["warnings"], [])
                self.assertEqual(response.headers["X-Request-Id"], "route-request-id")

    def test_internal_errors_use_a_stable_error_envelope(self):
        with patch.object(
            self.app.state.analytics_service,
            "statistics",
            new=AsyncMock(side_effect=RuntimeError("secret path")),
        ):
            response = self.client.post(
                "/api/v1/statistics",
                json={"hazards": [HAZARD]},
                headers={"X-Request-Id": "error-request-id"},
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["success"], False)
        self.assertEqual(response.json()["schemaVersion"], "1.0")
        self.assertEqual(response.json()["error"], {
            "code": "ANALYTICS_INTERNAL_ERROR",
            "message": "Analysis service failed to process the request.",
            "requestId": "error-request-id",
        })
        self.assertNotIn("secret path", response.text)

    def test_validation_errors_use_a_stable_error_envelope(self):
        response = self.client.post(
            "/api/v1/analyze",
            json={"hazards": [HAZARD] * 1001},
            headers={"X-Request-Id": "validation-request-id"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], "ANALYTICS_VALIDATION_ERROR")
        self.assertEqual(response.json()["error"]["requestId"], "validation-request-id")
        self.assertNotIn("hazards.1000", response.text)

    def test_risk_assessment_serializes_zero_score_for_missing_magnitude(self):
        response = self.client.post(
            "/api/v1/risk-assessment",
            json={"hazards": [{**HAZARD, "type": "WILDFIRE", "magnitude": None}]},
        )

        self.assertEqual(response.status_code, 200)
        type_risk = response.json()["data"]["typeRisks"]["WILDFIRE"]
        self.assertEqual(type_risk["riskScore"], 0)
        self.assertIsNone(type_risk["averageMagnitude"])

    def test_primary_analysis_routes_hide_internal_errors_and_return_request_ids(self):
        methods = ["comprehensive_analysis", "statistics", "predictions", "etl", "risk_assessment"]
        paths = ["/api/v1/analyze", "/api/v1/statistics", "/api/v1/predictions", "/api/v1/etl/process", "/api/v1/risk-assessment"]
        for path, method in zip(paths, methods):
            with self.subTest(path=path), patch.object(
                self.app.state.analytics_service, method, new=AsyncMock(side_effect=RuntimeError("secret path"))
            ):
                response = self.client.post(path, json={"hazards": [HAZARD]}, headers={"X-Request-Id": "valid-request-id"})
            self.assertEqual(response.status_code, 500)
            self.assertFalse(response.json()["success"])
            self.assertEqual(response.json()["error"]["code"], "ANALYTICS_INTERNAL_ERROR")
            self.assertNotIn("secret path", response.text)
            self.assertEqual(response.headers["X-Request-Id"], "valid-request-id")

    def test_validation_rejects_invalid_http_contracts_before_services_are_called(self):
        with patch.object(self.app.state.analytics_service, "comprehensive_analysis", new=AsyncMock()) as analyze:
            response = self.client.post("/api/v1/analyze", json={"hazards": [HAZARD] * 1001})
        self.assertEqual(response.status_code, 422)
        analyze.assert_not_awaited()
        self.assertEqual(self.client.post("/api/v1/quality/assess", json={"hazards": [HAZARD] * 1001}).status_code, 422)
        self.assertEqual(self.client.post("/api/v1/unified-model/merge", json={"usgs_data": [{}] * 1001}).status_code, 422)
        self.assertEqual(self.client.get("/api/v1/quality/history?limit=101").status_code, 422)

    def test_quality_routes_delegate_to_application_quality_service(self):
        cases = [
            ("/api/v1/quality/assess", "assess", {"hazards": [HAZARD]}, {"score": 1}),
            ("/api/v1/unified-model/transform", "transform", {"hazards": [HAZARD]}, {"total_records": 1}),
            ("/api/v1/unified-model/merge", "merge", {"usgs_data": []}, {"total_records": 1}),
        ]
        for path, method, payload, result in cases:
            with self.subTest(path=path), patch.object(self.app.state.quality_service, method, return_value=result) as service_method:
                response = self.client.post(path, json=payload)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["data"], result)
            service_method.assert_called_once()
        with patch.object(self.app.state.quality_service, "thresholds", return_value={"valid": 1}) as thresholds:
            response = self.client.get("/api/v1/quality/thresholds")
        self.assertEqual(response.json()["data"], {"valid": 1})
        thresholds.assert_called_once()

    def test_pivot_routes_delegate_to_application_pivot_service(self):
        payload = {"hazards": [HAZARD], "time_window": 14}
        cases = [
            ("/api/v1/pivot/create", "create"), ("/api/v1/pivot/query", "query"),
            ("/api/v1/pivot/trend-analysis", "trend_analysis"), ("/api/v1/pivot/risk-score", "risk_score"),
            ("/api/v1/pivot/summary", "summary"),
        ]
        for path, method in cases:
            expected = {"success": True, "data": {"operation": method}}
            with self.subTest(path=path), patch.object(self.app.state.pivot_service, method, return_value=expected) as service_method:
                response = self.client.post(path, json=payload)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])
            self.assertEqual(response.json()["data"], expected["data"])
            self.assertEqual(response.json()["schemaVersion"], "1.0")
            service_method.assert_called_once()

    def test_management_routes_keep_404_policy_and_work_on_application_state(self):
        self.app.state.analytics_service.cache["fixture"] = {"data": {}, "timestamp": __import__("datetime").datetime.now()}
        with patch.dict(os.environ, {"ANALYTICS_ADMIN_TOKEN": ""}):
            self.assertEqual(self.client.get("/health").status_code, 200)
            self.assertEqual(self.client.get("/metrics").status_code, 404)
            self.assertEqual(self.client.post("/cache/clear").status_code, 404)
        with patch.dict(os.environ, {"ANALYTICS_ADMIN_TOKEN": "test-admin-token"}):
            self.assertEqual(self.client.get("/metrics", headers={"X-Analytics-Admin-Token": "incorrect-token"}).status_code, 404)
            self.assertEqual(self.client.get("/metrics", headers={"X-Analytics-Admin-Token": "test-admin-token"}).status_code, 200)
            self.assertEqual(self.client.post("/cache/clear", headers={"X-Analytics-Admin-Token": "test-admin-token"}).status_code, 200)
        self.assertEqual(self.app.state.analytics_service.cache, {})

    def test_cors_policy_and_configured_origins_are_preserved(self):
        response = self.client.options("/api/v1/quality/thresholds", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "http://localhost:5173")
        self.assertIsNone(response.headers.get("access-control-allow-credentials"))
        self.assertEqual(self.client.options("/api/v1/quality/thresholds", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "PUT"}).status_code, 400)
        with patch.dict(os.environ, {"ANALYTICS_CORS_ORIGINS": "https://app.example, https://ops.example"}):
            self.assertEqual(security.get_cors_origins(), ["https://app.example", "https://ops.example"])


if __name__ == "__main__":
    unittest.main()
