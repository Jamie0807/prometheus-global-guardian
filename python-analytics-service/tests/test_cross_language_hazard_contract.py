"""验证跨语言灾害数据契约在 Python 端的兼容性。"""

import json
import sys
import unittest
from pathlib import Path

from pydantic import ValidationError


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.schemas.requests import AnalysisRequest, HazardData


FIXTURE_PATH = (
    Path(__file__).resolve().parents[2] / "contracts" / "analytics-hazard-data.json"
)


def load_fixture() -> dict[str, object]:
    with FIXTURE_PATH.open(encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


class CrossLanguageHazardContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = load_fixture()

    def test_accepts_shared_valid_hazards(self):
        valid = self.fixture["valid"]
        self.assertIsInstance(valid, dict)

        parsed = {
            name: HazardData.model_validate(value) for name, value in valid.items()
        }
        complete = parsed["complete"]
        nullable = parsed["nullableOptionalValues"]
        omitted_defaults = parsed["omittedDefaults"]
        request = AnalysisRequest(hazards=[complete])

        self.assertEqual(request.hazards, [complete])
        self.assertEqual(nullable.coordinates, [0.0, 0.0])
        self.assertIsNone(nullable.magnitude)
        self.assertIsNone(nullable.populationExposed)
        self.assertEqual(omitted_defaults.type, "unknown")
        self.assertEqual(omitted_defaults.title, "Unknown Event")
        self.assertEqual(omitted_defaults.coordinates, [0.0, 0.0])
        self.assertEqual(omitted_defaults.source, "DisasterAWARE")

    def test_rejects_shared_invalid_hazards(self):
        invalid = self.fixture["invalid"]
        self.assertIsInstance(invalid, list)

        for entry in invalid:
            self.assertIsInstance(entry, dict)
            with self.subTest(rule=entry["rule"]), self.assertRaises(ValidationError):
                HazardData.model_validate(entry["value"])

    def test_rejects_runtime_non_finite_magnitude(self):
        valid = self.fixture["valid"]
        self.assertIsInstance(valid, dict)
        invalid = {**valid["complete"], "magnitude": float("nan")}

        with self.assertRaises(ValidationError):
            HazardData.model_validate(invalid)


if __name__ == "__main__":
    unittest.main()
