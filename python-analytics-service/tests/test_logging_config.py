import io
import importlib
import logging
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

try:
    log_config = importlib.import_module("log_config")
except ModuleNotFoundError:
    log_config = None


class LoggingConfigTests(unittest.TestCase):
    def setUp(self):
        logging.disable(logging.NOTSET)
        self.root_logger = logging.getLogger()
        self.original_handlers = self.root_logger.handlers[:]
        self.original_level = self.root_logger.level

    def tearDown(self):
        logging.disable(logging.NOTSET)
        self.root_logger.handlers = self.original_handlers
        self.root_logger.setLevel(self.original_level)

    def test_logging_configuration_module_is_available(self):
        self.assertIsNotNone(log_config, "log_config module must provide centralized logging")

    @unittest.skipIf(log_config is None, "log_config module is not available")
    def test_resolve_log_level_accepts_supported_levels_and_warn_alias(self):
        fallback = logging.INFO

        self.assertEqual(log_config.resolve_log_level("debug", fallback), logging.DEBUG)
        self.assertEqual(log_config.resolve_log_level("info", fallback), logging.INFO)
        self.assertEqual(log_config.resolve_log_level("warn", fallback), logging.WARNING)
        self.assertEqual(log_config.resolve_log_level("warning", fallback), logging.WARNING)
        self.assertEqual(log_config.resolve_log_level("error", fallback), logging.ERROR)
        self.assertIsNone(log_config.resolve_log_level("silent", fallback))

    @unittest.skipIf(log_config is None, "log_config module is not available")
    def test_resolve_log_level_uses_fallback_for_invalid_values(self):
        self.assertEqual(log_config.resolve_log_level("verbose", logging.WARNING), logging.WARNING)
        self.assertEqual(log_config.resolve_log_level(None, logging.ERROR), logging.ERROR)

    @unittest.skipIf(log_config is None, "log_config module is not available")
    def test_configure_logging_uses_production_info_and_other_environment_debug(self):
        with patch.dict(os.environ, {"APP_ENV": "production"}, clear=True):
            log_config.configure_logging()
            self.assertEqual(self.root_logger.level, logging.INFO)

        with patch.dict(os.environ, {"APP_ENV": "development"}, clear=True):
            log_config.configure_logging()
            self.assertEqual(self.root_logger.level, logging.DEBUG)

    @unittest.skipIf(log_config is None, "log_config module is not available")
    def test_configure_logging_uses_explicit_log_level_and_silent_disables_output(self):
        with patch.dict(
            os.environ,
            {"APP_ENV": "production", "LOG_LEVEL": "warn"},
            clear=True,
        ):
            log_config.configure_logging()
            self.assertEqual(self.root_logger.level, logging.WARNING)

        with patch.dict(os.environ, {"LOG_LEVEL": "silent"}, clear=True):
            log_config.configure_logging()
            self.assertGreater(self.root_logger.level, logging.CRITICAL)
            self.assertTrue(
                all(isinstance(handler, logging.NullHandler) for handler in self.root_logger.handlers)
            )

    @unittest.skipIf(log_config is None, "log_config module is not available")
    def test_configure_logging_redacts_exception_details_and_sensitive_context(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"LOG_LEVEL": "debug"}, clear=True):
            log_config.configure_logging()
            handler = self.root_logger.handlers[0]
            handler.setStream(output)

            try:
                raise ValueError("exception-secret")
            except ValueError:
                logging.getLogger("analytics.test").error(
                    "analysis.failed",
                    extra={
                        "token": "token-secret",
                        "body": {"credential": "body-secret"},
                        "request_id": "request-123",
                    },
                    exc_info=True,
                )

        content = output.getvalue()
        self.assertIn("analysis.failed", content)
        self.assertNotIn("exception-secret", content)
        self.assertNotIn("token-secret", content)
        self.assertNotIn("body-secret", content)

    @unittest.skipIf(log_config is None, "log_config module is not available")
    def test_configure_logging_replaces_dynamic_messages_with_a_safe_event(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"LOG_LEVEL": "debug"}, clear=True):
            log_config.configure_logging()
            handler = self.root_logger.handlers[0]
            handler.setStream(output)
            logging.getLogger("analytics.test").error("analysis failed: token-secret")

        content = output.getvalue()
        self.assertIn("logging.event", content)
        self.assertNotIn("token-secret", content)


if __name__ == "__main__":
    unittest.main()
