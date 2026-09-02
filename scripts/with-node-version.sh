#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGINAL_HOME="${HOME:-}"
NODE_VERSION="$(tr -d '[:space:]' < "$PROJECT_ROOT/.nvmrc")"

if [[ -z "$NODE_VERSION" ]]; then
  printf 'Error: .nvmrc is empty.\n' >&2
  exit 1
fi

if [[ "$#" -eq 0 ]]; then
  printf 'Usage: %s <command> [args...]\n' "$0" >&2
  exit 1
fi

# Docker images and some CI runners already provide the exact project Node.js
# version but do not install nvm. Reuse that runtime directly in this case.
REQUIRED_NODE_VERSION="${NODE_VERSION#v}"
CURRENT_NODE_VERSION="$(node --version 2>/dev/null || true)"
REQUIRED_NODE_MAJOR_MINOR="${REQUIRED_NODE_VERSION%.*}"
CURRENT_NODE_MAJOR_MINOR="${CURRENT_NODE_VERSION#v}"
CURRENT_NODE_MAJOR_MINOR="${CURRENT_NODE_MAJOR_MINOR%.*}"
if [[ "$CURRENT_NODE_MAJOR_MINOR" == "$REQUIRED_NODE_MAJOR_MINOR" ]]; then
  exec "$@"
fi

NVM_DIR="${NVM_DIR:-$ORIGINAL_HOME/.nvm}"
export NVM_DIR

# Isolate nvm from user npmrc files that may define prefix/globalconfig. The
# temporary directory is removed after the requested command exits.
TEMP_HOME="$(mktemp -d "${TMPDIR:-/tmp}/prometheus-node-home.XXXXXX")"
cleanup() {
  rmdir "$TEMP_HOME" 2>/dev/null || true
}
trap cleanup EXIT
export HOME="$TEMP_HOME"
unset NPM_CONFIG_PREFIX npm_config_prefix

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  printf 'Error: nvm was not found at %s. Install nvm before starting the project.\n' "$NVM_DIR" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh" --no-use

if ! nvm use --silent "$NODE_VERSION" >/dev/null 2>&1; then
  printf 'Node.js %s is not installed. Installing it with nvm...\n' "$NODE_VERSION" >&2
  nvm install --no-progress "$NODE_VERSION"
  nvm use --silent "$NODE_VERSION" >/dev/null
fi

export HOME="$ORIGINAL_HOME"
"$@"
