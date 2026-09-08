import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
from fastapi.testclient import TestClient


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

import main as api
import security


HAZARD = {
    "id": "hazard-1",
    "type": "EARTHQUAKE",
    "title": "Example event",
    "coordinates": [116.4, 39.9],
    "timestamp": "2026-09-03T00:00:00.000Z",
    "magnitude": 4.5,
    "severity": "WARNING",
    "source": "USGS",
    "populationExposed": 1000,
}


class FourDimensionalHttpRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(api.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def make_payload(self, **overrides):
        return {
            "hazards": [HAZARD],
            "time_dim": "quarter",
            "geo_dim": "continent",
            "aggfunc": "mean",
            "time_range": [
                "2026-09-01T00:00:00.000Z",
                "2026-09-03T00:00:00.000Z",
            ],
            "regions": ["Asia-Pacific"],
            "types": ["EARTHQUAKE"],
            "severities": ["WARNING"],
            "time_window": 14,
            **overrides,
        }

    def test_create_route_returns_success_and_forwards_dimensions(self):
        analyzer = MagicMock()
        analyzer.create_4d_pivot.return_value = pd.DataFrame({"value": [4.5]})
        analyzer.get_summary_statistics.return_value = {"total_records": 1}
        analyzer.export_pivot_to_dict.return_value = {"records": []}

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = self.client.post(
                "/api/v1/pivot/create", json=self.make_payload()
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        analyzer.create_4d_pivot.assert_called_once_with(
            time_dim="quarter",
            geo_dim="continent",
            type_dim="type_category",
            severity_dim="severity",
            aggfunc="mean",
            values_col="magnitude",
        )

    def test_query_route_returns_success_forwards_filters_and_echoes_parameters(self):
        analyzer = MagicMock()
        analyzer.multi_dimensional_query.return_value = pd.DataFrame(
            [{"type": "EARTHQUAKE", "count": 1}]
        )

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = self.client.post(
                "/api/v1/pivot/query", json=self.make_payload()
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["total_count"], 1)
        self.assertEqual(
            response.json()["data"]["query_params"],
            {
                "time_range": [
                    "2026-09-01T00:00:00.000Z",
                    "2026-09-03T00:00:00.000Z",
                ],
                "regions": ["Asia-Pacific"],
                "types": ["EARTHQUAKE"],
                "severities": ["WARNING"],
            },
        )
        call = analyzer.multi_dimensional_query.call_args.kwargs
        self.assertEqual(call["regions"], ["Asia-Pacific"])
        self.assertEqual(call["types"], ["EARTHQUAKE"])
        self.assertEqual(call["severities"], ["WARNING"])
        self.assertEqual(
            call["time_range"],
            (
                pd.Timestamp("2026-09-01T00:00:00.000Z"),
                pd.Timestamp("2026-09-03T00:00:00.000Z"),
            ),
        )

    def test_trend_route_returns_success_and_forwards_time_window(self):
        analyzer = MagicMock()
        analyzer.trend_analysis_4d.return_value = pd.DataFrame(
            [
                {
                    "trend_direction": "increasing",
                    "severity": "WARNING",
                    "trend_slope": 1.5,
                }
            ]
        )

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = self.client.post(
                "/api/v1/pivot/trend-analysis", json=self.make_payload()
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["time_window"], 14)
        analyzer.trend_analysis_4d.assert_called_once_with(time_window=14)

    def test_risk_route_returns_success_and_forwards_time_window(self):
        analyzer = MagicMock()
        analyzer.risk_score_4d.return_value = pd.DataFrame(
            [{"risk_score": 0.75, "region": "Asia"}]
        )

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = self.client.post(
                "/api/v1/pivot/risk-score", json=self.make_payload()
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["time_window"], 14)
        analyzer.risk_score_4d.assert_called_once_with(time_window=14)

    def test_summary_route_returns_success_and_summary(self):
        analyzer = MagicMock()
        analyzer.get_summary_statistics.return_value = {"total_records": 1}

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = self.client.post(
                "/api/v1/pivot/summary", json=self.make_payload()
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"], {"total_records": 1})

    def test_invalid_contract_requests_return_422(self):
        invalid_payloads = [
            {"data": [HAZARD]},
            {"time_dim": "invalid"},
            {"aggfunc": "median"},
            {"time_range": ["2026-09-01T00:00:00.000Z"]},
            {"time_range": ["not-a-timestamp", "2026-09-03T00:00:00.000Z"]},
            {"time_window": 0},
            {"unexpected": True},
        ]

        for overrides in invalid_payloads:
            with self.subTest(overrides=overrides):
                payload = self.make_payload(**overrides)
                if "data" in overrides:
                    payload.pop("hazards")
                response = self.client.post("/api/v1/pivot/summary", json=payload)
                self.assertEqual(response.status_code, 422)

    def test_empty_trend_result_returns_success_with_explicit_message(self):
        analyzer = MagicMock()
        analyzer.trend_analysis_4d.return_value = pd.DataFrame()

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = self.client.post(
                "/api/v1/pivot/trend-analysis", json=self.make_payload()
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["trends"], [])
        self.assertEqual(response.json()["data"]["time_window"], 14)


class PythonManagementBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(api.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_health_remains_public_but_management_routes_require_a_configured_token(self):
        with patch.dict(os.environ, {"ANALYTICS_ADMIN_TOKEN": ""}):
            self.assertEqual(self.client.get("/health").status_code, 200)
            self.assertEqual(self.client.get("/metrics").status_code, 404)
            self.assertEqual(self.client.post("/cache/clear").status_code, 404)

    def test_management_routes_reject_invalid_tokens_and_accept_the_configured_token(self):
        api.GLOBAL_CACHE["fixture"] = {"data": {}, "timestamp": api.datetime.now()}

        with patch.dict(os.environ, {"ANALYTICS_ADMIN_TOKEN": "test-admin-token"}):
            self.assertEqual(
                self.client.get(
                    "/metrics", headers={"X-Analytics-Admin-Token": "incorrect-token"}
                ).status_code,
                404,
            )
            self.assertEqual(
                self.client.get(
                    "/metrics", headers={"X-Analytics-Admin-Token": "test-admin-token"}
                ).status_code,
                200,
            )
            self.assertEqual(
                self.client.post(
                    "/cache/clear",
                    headers={"X-Analytics-Admin-Token": "test-admin-token"},
                ).status_code,
                200,
            )

        self.assertEqual(api.GLOBAL_CACHE, {})

    def test_cors_disallows_credentials_and_unsupported_methods(self):
        allowed_origin = "http://localhost:5173"
        response = self.client.options(
            "/api/v1/quality/thresholds",
            headers={
                "Origin": allowed_origin,
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), allowed_origin)
        self.assertIsNone(response.headers.get("access-control-allow-credentials"))

        unsupported_method_response = self.client.options(
            "/api/v1/quality/thresholds",
            headers={
                "Origin": allowed_origin,
                "Access-Control-Request-Method": "PUT",
            },
        )
        self.assertEqual(unsupported_method_response.status_code, 400)

        untrusted_origin_response = self.client.options(
            "/api/v1/quality/thresholds",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(untrusted_origin_response.status_code, 400)
        self.assertIsNone(
            untrusted_origin_response.headers.get("access-control-allow-origin")
        )

    def test_cors_origin_override_uses_the_configured_explicit_origins(self):
        with patch.dict(
            os.environ,
            {"ANALYTICS_CORS_ORIGINS": "https://app.example, https://ops.example"},
        ):
            self.assertEqual(
                security.get_cors_origins(),
                ["https://app.example", "https://ops.example"],
            )


if __name__ == "__main__":
    unittest.main()
