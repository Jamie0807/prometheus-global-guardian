import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
from pydantic import ValidationError


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

import main as api


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


class AnalysisRequestContractTests(unittest.TestCase):
    def test_accepts_complete_analytics_and_4d_contract(self):
        request = api.AnalysisRequest(
            hazards=[HAZARD],
            analysisType="comprehensive",
            timeRange=30,
            time_dim="quarter",
            geo_dim="continent",
            aggfunc="mean",
            time_range=[
                "2026-09-01T00:00:00.000Z",
                "2026-09-03T00:00:00.000Z",
            ],
            regions=["Asia-Pacific"],
            types=["EARTHQUAKE"],
            severities=["WARNING"],
            time_window=14,
        )

        self.assertEqual(request.time_dim, "quarter")
        self.assertEqual(request.geo_dim, "continent")
        self.assertEqual(request.aggfunc, "mean")
        self.assertEqual(
            request.time_range,
            ("2026-09-01T00:00:00.000Z", "2026-09-03T00:00:00.000Z"),
        )
        self.assertEqual(request.regions, ["Asia-Pacific"])
        self.assertEqual(request.types, ["EARTHQUAKE"])
        self.assertEqual(request.severities, ["WARNING"])
        self.assertEqual(request.time_window, 14)

    def test_requires_hazards_and_does_not_accept_data_alias(self):
        with self.assertRaises(ValidationError):
            api.AnalysisRequest(data=[HAZARD])

    def test_rejects_invalid_4d_parameters_at_the_api_boundary(self):
        invalid_payloads = [
            {"time_dim": "invalid"},
            {"geo_dim": "invalid"},
            {"aggfunc": "median"},
            {"time_range": ["2026-09-01T00:00:00.000Z"]},
            {"time_window": 0},
        ]

        for overrides in invalid_payloads:
            with self.subTest(overrides=overrides):
                with self.assertRaises(ValidationError):
                    api.AnalysisRequest(hazards=[HAZARD], **overrides)


class FourDimensionalEndpointContractTests(unittest.TestCase):
    def make_request(self, **overrides):
        payload = {"hazards": [HAZARD], **overrides}
        return api.AnalysisRequest(**payload)

    def test_create_uses_declared_dimensions_and_aggregation(self):
        analyzer = MagicMock()
        pivot_table = pd.DataFrame({"value": [1]})
        analyzer.create_4d_pivot.return_value = pivot_table
        analyzer.get_summary_statistics.return_value = {"total": 1}
        analyzer.export_pivot_to_dict.return_value = {"records": []}
        request = self.make_request(
            time_dim="quarter",
            geo_dim="continent",
            aggfunc="mean",
        )

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = asyncio.run(api.create_4d_pivot_table(request))

        analyzer.create_4d_pivot.assert_called_once_with(
            time_dim="quarter",
            geo_dim="continent",
            type_dim="type_category",
            severity_dim="severity",
            aggfunc="mean",
            values_col="magnitude",
        )
        self.assertTrue(response["success"])

    def test_numeric_aggregation_uses_magnitude_column(self):
        analyzer = api.FourDimensionalPivotTable(pd.DataFrame([HAZARD]))
        pivot_table = analyzer.create_4d_pivot(
            time_dim="month",
            geo_dim="region",
            aggfunc="mean",
            values_col="magnitude",
        )

        self.assertFalse(pivot_table.empty)
        self.assertEqual(float(pivot_table.iloc[0, 0]), 4.5)

    def test_query_uses_declared_filters_and_echoes_raw_parameters(self):
        analyzer = MagicMock()
        analyzer.multi_dimensional_query.return_value = pd.DataFrame(
            [{"type": "EARTHQUAKE"}]
        )
        raw_time_range = [
            "2026-09-01T00:00:00.000Z",
            "2026-09-03T00:00:00.000Z",
        ]
        request = self.make_request(
            time_range=raw_time_range,
            regions=["Asia-Pacific"],
            types=["EARTHQUAKE"],
            severities=["WARNING"],
        )

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = asyncio.run(api.multi_dimensional_query(request))

        call = analyzer.multi_dimensional_query.call_args.kwargs
        self.assertEqual(
            call["time_range"],
            (pd.Timestamp(raw_time_range[0]), pd.Timestamp(raw_time_range[1])),
        )
        self.assertEqual(call["regions"], ["Asia-Pacific"])
        self.assertEqual(call["types"], ["EARTHQUAKE"])
        self.assertEqual(call["severities"], ["WARNING"])
        self.assertEqual(
            response["data"]["query_params"],
            {
                "time_range": tuple(raw_time_range),
                "regions": ["Asia-Pacific"],
                "types": ["EARTHQUAKE"],
                "severities": ["WARNING"],
            },
        )

    def test_trend_uses_declared_time_window_and_echoes_it(self):
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
        request = self.make_request(time_window=14)

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = asyncio.run(api.analyze_4d_trends(request))

        analyzer.trend_analysis_4d.assert_called_once_with(time_window=14)
        self.assertEqual(response["data"]["time_window"], 14)

    def test_empty_trend_result_still_echoes_declared_time_window(self):
        analyzer = MagicMock()
        analyzer.trend_analysis_4d.return_value = pd.DataFrame()
        request = self.make_request(time_window=14)

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = asyncio.run(api.analyze_4d_trends(request))

        self.assertEqual(response["data"]["time_window"], 14)

    def test_risk_uses_declared_time_window_and_echoes_it(self):
        analyzer = MagicMock()
        analyzer.risk_score_4d.return_value = pd.DataFrame([{"risk_score": 0.75}])
        request = self.make_request(time_window=21)

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = asyncio.run(api.calculate_4d_risk_scores(request))

        analyzer.risk_score_4d.assert_called_once_with(time_window=21)
        self.assertEqual(response["data"]["time_window"], 21)

    def test_empty_risk_result_still_echoes_declared_time_window(self):
        analyzer = MagicMock()
        analyzer.risk_score_4d.return_value = pd.DataFrame()
        request = self.make_request(time_window=21)

        with patch.object(api, "FourDimensionalPivotTable", return_value=analyzer):
            response = asyncio.run(api.calculate_4d_risk_scores(request))

        self.assertEqual(response["data"]["time_window"], 21)


if __name__ == "__main__":
    unittest.main()
