"""验证跨语言灾害数据契约在 Python 端的兼容性。"""

import json
import sys
import unittest
from pathlib import Path

from pydantic import ValidationError


SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = (
    SERVICE_ROOT.parent.parent if SERVICE_ROOT.name == "analytics" else SERVICE_ROOT
)
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.schemas.requests import AnalysisRequest, HazardData


FIXTURE_PATH = (
    REPOSITORY_ROOT / "packages" / "contracts" / "analytics-hazard-data.json"
)
CANONICAL_FIXTURE_PATH = (
    REPOSITORY_ROOT / "packages" / "contracts" / "hazard-event.json"
)


def load_fixture() -> dict[str, object]:
    with FIXTURE_PATH.open(encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


def load_canonical_fixture() -> dict[str, object]:
    with CANONICAL_FIXTURE_PATH.open(encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


def to_analytics_hazard(event: dict[str, object]) -> dict[str, object]:
    geometry = event["geometry"]
    assert isinstance(geometry, dict)
    coordinates = geometry["coordinates"]
    assert isinstance(coordinates, list)

    hazard = {
        "id": event["eventId"],
        "type": event["type"],
        "title": event["title"],
        "coordinates": coordinates[:2],
        "timestamp": event.get("observedAt", "2026-09-11T00:00:00.000Z"),
        "source": event["sourceId"],
        "schemaVersion": event["schemaVersion"],
        "eventId": event["eventId"],
        "sourceEventId": event["sourceEventId"],
        "sourceId": event["sourceId"],
        "layerId": event["layerId"],
    }
    for field in ("observedAt", "updatedAt", "severity", "confidence", "magnitude"):
        if field in event:
            hazard[field] = event[field]
    return hazard


class CrossLanguageHazardContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = load_fixture()
        cls.canonical_fixture = load_canonical_fixture()

    def test_accepts_shared_canonical_event_sample(self):
        event = self.canonical_fixture["valid"]["complete"]
        self.assertIsInstance(event, dict)

        hazard = HazardData.model_validate(to_analytics_hazard(event))

        self.assertEqual(hazard.eventId, "usgs:usgs-1")
        self.assertEqual(hazard.sourceEventId, "usgs-1")
        self.assertEqual(hazard.sourceId, "usgs")
        self.assertEqual(hazard.layerId, "earthquake")
        self.assertEqual(hazard.confidence, 0.8)

    def test_normalizes_unknown_canonical_layer_to_unknown(self):
        event = {
            **self.canonical_fixture["valid"]["unknownType"],
            "layerId": "future-layer",
        }

        hazard = HazardData.model_validate(to_analytics_hazard(event))

        self.assertEqual(hazard.layerId, "unknown")

    def test_rejects_canonical_confidence_outside_inclusive_range(self):
        event = self.canonical_fixture["valid"]["complete"]
        for confidence in (-0.01, 1.01, None, "0.8", True):
            with self.subTest(confidence=confidence), self.assertRaises(ValidationError):
                HazardData.model_validate(
                    to_analytics_hazard({**event, "confidence": confidence})
                )

    def test_rejects_canonical_event_id_mismatch(self):
        event = self.canonical_fixture["valid"]["complete"]

        with self.assertRaises(ValidationError):
            HazardData.model_validate(
                to_analytics_hazard({**event, "eventId": "usgs:other-event"})
            )

    def test_accepts_omitted_canonical_optional_fields_but_rejects_explicit_null(self):
        omitted_event = self.canonical_fixture["valid"]["optionalOmitted"]
        self.assertIsInstance(omitted_event, dict)
        HazardData.model_validate(to_analytics_hazard(omitted_event))

        complete_event = self.canonical_fixture["valid"]["complete"]
        self.assertIsInstance(complete_event, dict)
        for field in (
            "schemaVersion",
            "eventId",
            "sourceEventId",
            "sourceId",
            "layerId",
            "observedAt",
            "updatedAt",
            "confidence",
        ):
            payload = to_analytics_hazard({**complete_event, field: None})
            if field == "observedAt":
                payload["timestamp"] = "2026-09-11T00:00:00.000Z"
            with self.subTest(field=field), self.assertRaises(ValidationError):
                HazardData.model_validate(payload)

    def test_rejects_every_invalid_shared_canonical_sample(self):
        for entry in self.canonical_fixture["invalid"]:
            with self.subTest(rule=entry["rule"]), self.assertRaises(ValidationError):
                HazardData.model_validate(to_analytics_hazard(entry["value"]))

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
