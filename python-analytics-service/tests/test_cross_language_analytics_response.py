"""验证 Python 与 TypeScript 共用的 Analytics 响应信封。"""

import json
import sys
import unittest
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.core.responses import input_snapshot_id
from app.schemas.responses import AnalyticsErrorResponse, AnalyticsSuccessResponse


class CrossLanguageAnalyticsResponseTests(unittest.TestCase):
    def test_shared_fixture_matches_versioned_success_response(self):
        fixture_path = SERVICE_ROOT.parent / "packages" / "contracts" / "analytics-response-envelope.json"
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

        response = AnalyticsSuccessResponse.model_validate(fixture)

        self.assertEqual(response.schemaVersion, "1.0")
        self.assertEqual(response.requestId, "fixture-request-id")
        self.assertEqual(response.modelVersion, "analytics-model-v1")
        self.assertEqual(response.warnings, [])

    def test_shared_error_fixture_matches_versioned_error_response(self):
        fixture_path = SERVICE_ROOT.parent / "packages" / "contracts" / "analytics-error-envelope.json"
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

        response = AnalyticsErrorResponse.model_validate(fixture)

        self.assertFalse(response.success)
        self.assertEqual(response.error.code, "ANALYTICS_INTERNAL_ERROR")
        self.assertEqual(response.error.requestId, response.requestId)

    def test_input_snapshot_id_is_stable_for_equivalent_mappings(self):
        self.assertEqual(
            input_snapshot_id({"hazards": [], "timeRange": 30}),
            input_snapshot_id({"timeRange": 30, "hazards": []}),
        )
        self.assertNotEqual(
            input_snapshot_id({"hazards": []}),
            input_snapshot_id({"hazards": [{"id": "new"}]}),
        )


if __name__ == "__main__":
    unittest.main()
