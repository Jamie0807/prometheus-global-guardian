#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_PYTHON="$PROJECT_ROOT/python-analytics-service/.venv/bin/python"

if [[ -x "$LOCAL_PYTHON" ]]; then
  exec "$LOCAL_PYTHON" -m unittest discover -s "$PROJECT_ROOT/python-analytics-service/tests" -p 'test_*.py'
fi

exec python3 -m unittest discover -s "$PROJECT_ROOT/python-analytics-service/tests" -p 'test_*.py'
