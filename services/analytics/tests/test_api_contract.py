"""验证数据分析 API 的请求契约和参数边界。"""

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
from pydantic import ValidationError


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.schemas.requests import AnalysisRequest, HazardData, QualityCheckRequest, UnifiedDataRequest
from app.services.analytics_service import AnalyticsService
from app.services.pivot_service import PivotService


HAZARD = {
    "id": "hazard-1", "type": "EARTHQUAKE", "title": "Example event",
    "coordinates": [116.4, 39.9], "timestamp": "2026-09-03T00:00:00.000Z",
    "magnitude": 4.5, "severity": "WARNING", "source": "USGS", "populationExposed": 1000,
}


class AnalysisRequestContractTests(unittest.TestCase):
    def test_accepts_complete_analytics_and_4d_contract(self):
        request = AnalysisRequest(
            hazards=[HAZARD], analysisType="comprehensive", timeRange=30,
            time_dim="quarter", geo_dim="continent", aggfunc="mean",
            time_range=["2026-09-01T00:00:00.000Z", "2026-09-03T00:00:00.000Z"],
            regions=["Asia-Pacific"], types=["EARTHQUAKE"], severities=["WARNING"], time_window=14,
        )
        self.assertEqual(request.time_dim, "quarter")
        self.assertEqual(request.geo_dim, "continent")
        self.assertEqual(request.aggfunc, "mean")
        self.assertEqual(request.time_range, ("2026-09-01T00:00:00.000Z", "2026-09-03T00:00:00.000Z"))

    def test_rejects_invalid_contract_values(self):
        invalid_requests = [
            {"hazards": [HAZARD] * 1001}, {"hazards": [{**HAZARD, "coordinates": [181, 91]}]},
            {"hazards": [HAZARD], "time_range": ["2026-09-03T00:00:00.000Z", "2026-09-01T00:00:00.000Z"]},
            {"hazards": [HAZARD], "timeRange": 0}, {"hazards": [HAZARD], "timeRange": 3651},
            {"hazards": [HAZARD], "time_window": 366}, {"hazards": [HAZARD], "regions": ["Asia"] * 101},
            {"hazards": [HAZARD], "regions": [" "]}, {"hazards": [{**HAZARD, "source": " "}]},
            {"hazards": [{**HAZARD, "title": "x" * 257}]}, {"hazards": [{**HAZARD, "magnitude": float("inf")}]} ,
            {"hazards": [{**HAZARD, "populationExposed": -1}]},
        ]
        for payload in invalid_requests:
            with self.subTest(payload=payload), self.assertRaises(ValidationError):
                AnalysisRequest(**payload)

    def test_rejects_non_finite_magnitude_and_fractional_population(self):
        for overrides in (
            {"magnitude": float("nan")},
            {"magnitude": float("inf")},
            {"populationExposed": 1.5},
        ):
            with self.subTest(overrides=overrides), self.assertRaises(ValidationError):
                HazardData.model_validate({**HAZARD, **overrides})

    def test_rejects_non_json_numbers_in_hazard_fields(self):
        for overrides in (
            {"coordinates": ["116.4", 39.9]},
            {"coordinates": [True, 39.9]},
            {"magnitude": "4.5"},
            {"magnitude": True},
            {"populationExposed": "1000"},
            {"populationExposed": True},
        ):
            with self.subTest(overrides=overrides), self.assertRaises(ValidationError):
                HazardData.model_validate({**HAZARD, **overrides})

    def test_rejects_invalid_4d_parameters_and_source_models(self):
        for overrides in ({"time_dim": "invalid"}, {"geo_dim": "invalid"}, {"aggfunc": "median"}, {"time_range": ["2026-09-01T00:00:00.000Z"]}, {"time_window": 0}):
            with self.subTest(overrides=overrides), self.assertRaises(ValidationError):
                AnalysisRequest(hazards=[HAZARD], **overrides)
        with self.assertRaises(ValidationError):
            UnifiedDataRequest(usgs_data=[{}] * 1001)
        with self.assertRaises(ValidationError):
            QualityCheckRequest(hazards=[HAZARD], source=" ")


class AnalyticsServiceContractTests(unittest.TestCase):
    def test_cache_key_uses_the_complete_request_semantics(self):
        service = AnalyticsService()
        request = AnalysisRequest(hazards=[HAZARD])
        self.assertEqual(service.cache_key(request), service.cache_key(AnalysisRequest(hazards=[HAZARD])))
        self.assertNotEqual(service.cache_key(request), service.cache_key(AnalysisRequest(hazards=[HAZARD], analysisType="forecast")))
        self.assertNotEqual(service.cache_key(request), service.cache_key(AnalysisRequest(hazards=[{**HAZARD, "title": "Different event"}])))

    def test_comprehensive_analysis_uses_three_worker_parallel_engine_execution(self):
        service = AnalyticsService()
        dataframe = pd.DataFrame([HAZARD])
        with patch.object(service.etl_processor, "convert_to_dataframe", return_value=dataframe), patch.object(service.statistical_analyzer, "run_comprehensive_analysis", return_value={}), patch.object(service.prediction_engine, "generate_predictions", return_value={}), patch.object(service.risk_assessor, "calculate_comprehensive_risk", return_value={}), patch.object(service.etl_processor, "assess_data_quality", return_value={}), patch("app.services.analytics_service.ThreadPoolExecutor") as executor_class:
            executor = executor_class.return_value.__enter__.return_value
            executor.submit.side_effect = [MagicMock(result=lambda: {}), MagicMock(result=lambda: {}), MagicMock(result=lambda: {})]
            result = service.run_comprehensive_analysis(AnalysisRequest(hazards=[HAZARD]))
        executor_class.assert_called_once_with(max_workers=3)
        self.assertEqual(result["processingInfo"]["totalRecords"], 1)


class PivotServiceContractTests(unittest.TestCase):
    def make_request(self, **overrides):
        return AnalysisRequest(hazards=[HAZARD], **overrides)

    def test_create_uses_declared_dimensions_and_aggregation(self):
        analyzer = MagicMock()
        pivot_table = pd.DataFrame({"value": [1]})
        analyzer.create_4d_pivot.return_value = pivot_table
        analyzer.get_summary_statistics.return_value = {"total": 1}
        analyzer.export_pivot_to_dict.return_value = {"records": []}
        with patch("app.services.pivot_service.FourDimensionalPivotTable", return_value=analyzer):
            response = PivotService().create(self.make_request(time_dim="quarter", geo_dim="continent", aggfunc="mean"))
        analyzer.create_4d_pivot.assert_called_once_with(time_dim="quarter", geo_dim="continent", type_dim="type_category", severity_dim="severity", aggfunc="mean", values_col="magnitude")
        self.assertTrue(response["success"])

    def test_query_uses_declared_filters_and_echoes_raw_parameters(self):
        analyzer = MagicMock()
        analyzer.multi_dimensional_query.return_value = pd.DataFrame([{"type": "EARTHQUAKE"}])
        request = self.make_request(time_range=["2026-09-01T00:00:00.000Z", "2026-09-03T00:00:00.000Z"], regions=["Asia-Pacific"], types=["EARTHQUAKE"], severities=["WARNING"])
        with patch("app.services.pivot_service.FourDimensionalPivotTable", return_value=analyzer):
            response = PivotService().query(request)
        self.assertEqual(analyzer.multi_dimensional_query.call_args.kwargs["time_range"], (pd.Timestamp(request.time_range[0]), pd.Timestamp(request.time_range[1])))
        self.assertEqual(response["data"]["query_params"]["regions"], ["Asia-Pacific"])

    def test_trend_and_risk_preserve_time_window_for_empty_results(self):
        analyzer = MagicMock()
        analyzer.trend_analysis_4d.return_value = pd.DataFrame()
        analyzer.risk_score_4d.return_value = pd.DataFrame()
        with patch("app.services.pivot_service.FourDimensionalPivotTable", return_value=analyzer):
            trend = PivotService().trend_analysis(self.make_request(time_window=14))
            risk = PivotService().risk_score(self.make_request(time_window=21))
        self.assertEqual(trend["data"]["time_window"], 14)
        self.assertEqual(risk["data"]["time_window"], 21)


if __name__ == "__main__":
    unittest.main()
