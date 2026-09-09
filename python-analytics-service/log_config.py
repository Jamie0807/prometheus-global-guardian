"""Centralized, safe logging configuration for the analytics service."""

import logging
import os
import re
from typing import Union


LogLevel = Union[int, None]

_LOG_LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warn": logging.WARNING,
    "warning": logging.WARNING,
    "error": logging.ERROR,
    "silent": None,
}
_SENSITIVE_FIELD_PARTS = (
    "token",
    "secret",
    "password",
    "credential",
    "authorization",
    "body",
    "payload",
    "header",
    "response",
    "exception",
)
_SAFE_EVENT_NAME = re.compile(r"^[a-z][a-z0-9_.-]*$")


def resolve_log_level(value: object, fallback: int) -> LogLevel:
    """Resolve a supported log level, falling back when the value is invalid."""
    if not isinstance(value, str):
        return fallback

    return _LOG_LEVELS.get(value.strip().lower(), fallback)


class SensitiveDataFilter(logging.Filter):
    """Prevent exception details and sensitive context from reaching log output."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.exc_info = None
        record.exc_text = None

        if not isinstance(record.msg, str) or record.args or not _SAFE_EVENT_NAME.fullmatch(record.msg):
            record.msg = "logging.event"
            record.args = ()

        for field_name in tuple(record.__dict__):
            normalized_field_name = field_name.lower()
            if any(part in normalized_field_name for part in _SENSITIVE_FIELD_PARTS):
                delattr(record, field_name)

        return True


def _default_log_level() -> int:
    return logging.INFO if os.getenv("APP_ENV") == "production" else logging.DEBUG


def configure_logging() -> LogLevel:
    """Configure root logging from LOG_LEVEL and APP_ENV without basicConfig."""
    level = resolve_log_level(os.getenv("LOG_LEVEL"), _default_log_level())
    root_logger = logging.getLogger()

    root_logger.handlers.clear()
    root_logger.setLevel(logging.CRITICAL + 1 if level is None else level)

    if level is None:
        root_logger.addHandler(logging.NullHandler())
        return level

    handler = logging.StreamHandler()
    handler.setLevel(level)
    handler.addFilter(SensitiveDataFilter())
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    root_logger.addHandler(handler)
    return level
