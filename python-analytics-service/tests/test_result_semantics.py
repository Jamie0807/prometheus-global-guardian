"""验证分析结果的语义、边界和序列化行为。"""

import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from analytics.prediction_models import PredictionEngine
from analytics.quality_monitor import DataQualityMonitor
from analytics.risk_assessment import RiskAssessor
from analytics.statistical_algorithms import StatisticalAnalyzer, clean_for_json


def make_hazard_frame(count=1, hazard_type="EARTHQUAKE"):
    return pd.DataFrame(
        [
            {
                "id": f"hazard-{index}",
                "type": hazard_type,
                "timestamp": (
                    datetime.now(timezone.utc) - timedelta(days=index % 3)
                ).isoformat(),
                "magnitude": 4.5,
                "severity": "WARNING",
                "source": "USGS",
                "coordinates": [116.4, 39.9],
                "latitude": 39.9,
                "longitude": 116.4,
                "confidence": 1.0,
                "populationExposed": 0,
            }
            for index in range(count)
        ]
    )


class PredictionResultSemanticsTests(unittest.TestCase):
    def test_insufficient_predictions_expose_reason_and_sample_requirements(self):
        results = PredictionEngine().generate_predictions(make_hazard_frame())

        for key in (
            "earthquakePrediction",
            "volcanoPrediction",
            "stormPrediction",
            "floodPrediction",
            "wildfirePrediction",
        ):
            result = results[key]
            self.assertEqual(result["status"], "insufficient_data")
            self.assertEqual(result["reason"], "not_enough_data")
            self.assertIn("dataPoints", result)
            self.assertIn("minimumDataPoints", result)
            self.assertIsNone(result["confidence"])

    def test_ready_prediction_has_bounded_confidence(self):
        frame = make_hazard_frame(count=5)
        results = PredictionEngine().generate_predictions(frame)

        earthquake = results["earthquakePrediction"]
        self.assertEqual(earthquake["status"], "ready")
        self.assertEqual(earthquake["reason"], "model_fitted")
        self.assertEqual(earthquake["dataPoints"], 5)
        self.assertEqual(earthquake["minimumDataPoints"], 5)
        self.assertGreaterEqual(earthquake["confidence"], 0)
        self.assertLessEqual(earthquake["confidence"], 1)

    def test_model_exception_returns_stable_failed_result(self):
        with patch(
            "analytics.prediction_models.LinearRegression.fit",
            side_effect=ValueError("model detail"),
        ):
            result = PredictionEngine()._earthquake_prediction_model(
                make_hazard_frame(count=5)
            )

        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["reason"], "model_error")
        self.assertNotIn("error", result)
        self.assertNotIn("model detail", str(result))

    def test_aggregate_risk_exception_returns_stable_failed_result(self):
        engine = PredictionEngine()
        with patch.object(engine, "_get_risk_level", side_effect=ValueError("secret detail")):
            result = engine._aggregate_risk_assessment(make_hazard_frame(count=5), [0.8])

        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["reason"], "model_error")
        self.assertIsNone(result["confidence"])
        self.assertNotIn("error", result)
        self.assertNotIn("secret detail", str(result))


class StatisticalResultSemanticsTests(unittest.TestCase):
    def test_clean_for_json_converts_nested_numpy_non_finite_values(self):
        result = clean_for_json({"values": [np.float64("nan"), np.float64("inf")]})

        self.assertEqual(result, {"values": [None, None]})

    def test_statistics_missing_required_column_raises_stable_error(self):
        frame = pd.DataFrame({"timestamp": [datetime.now(timezone.utc).isoformat()]})

        with self.assertRaisesRegex(ValueError, "Missing required columns: \\['type'\\]"):
            StatisticalAnalyzer().run_comprehensive_analysis(frame)


class RiskResultSemanticsTests(unittest.TestCase):
    def test_risk_score_is_zero_when_a_type_has_no_magnitude(self):
        frame = make_hazard_frame(count=1, hazard_type="WILDFIRE")
        frame["magnitude"] = None

        result = RiskAssessor().calculate_comprehensive_risk(frame)

        self.assertEqual(result["typeRisks"]["WILDFIRE"]["riskScore"], 0)
        self.assertIsNone(result["typeRisks"]["WILDFIRE"]["averageMagnitude"])

    def test_risk_score_uses_the_average_when_magnitude_is_available(self):
        frame = make_hazard_frame(count=2, hazard_type="WILDFIRE")
        frame["magnitude"] = [2.0, 4.0]

        result = RiskAssessor().calculate_comprehensive_risk(frame)

        self.assertEqual(result["typeRisks"]["WILDFIRE"]["riskScore"], 0.9)
        self.assertEqual(result["typeRisks"]["WILDFIRE"]["averageMagnitude"], 3.0)

    def test_risk_result_exposes_structured_recommendation_rules(self):
        frame = make_hazard_frame(count=51)
        result = RiskAssessor().calculate_comprehensive_risk(frame)

        self.assertIn("recommendationDetails", result)
        self.assertGreater(len(result["recommendationDetails"]), 0)
        for recommendation in result["recommendationDetails"]:
            self.assertIn("ruleId", recommendation)
            self.assertIn("severity", recommendation)
            self.assertIn("metrics", recommendation)
            self.assertIn("message", recommendation)

    def test_risk_empty_data_raises_stable_error(self):
        with self.assertRaisesRegex(ValueError, "Invalid dataframe for risk assessment"):
            RiskAssessor().calculate_comprehensive_risk(pd.DataFrame())


class QualityResultSemanticsTests(unittest.TestCase):
    def test_quality_accepts_frontend_enum_casing_and_source_alias(self):
        frame = make_hazard_frame()
        report = DataQualityMonitor().assess_quality(frame, "DisasterAWARE")

        self.assertEqual(report["dimensions"]["consistency"]["score"], 1.0)

    def test_quality_scores_are_bounded_for_unknown_and_duplicate_data(self):
        frame = make_hazard_frame(count=2)
        frame["id"] = "duplicate"
        frame["type"] = "UNKNOWN"
        frame["source"] = "UNKNOWN"
        frame["severity"] = "UNKNOWN"

        report = DataQualityMonitor().assess_quality(frame, "unknown")

        self.assertGreaterEqual(report["overall_score"], 0)
        self.assertLessEqual(report["overall_score"], 1)
        for dimension in report["dimensions"].values():
            self.assertGreaterEqual(dimension["score"], 0)
            self.assertLessEqual(dimension["score"], 1)


if __name__ == "__main__":
    unittest.main()
