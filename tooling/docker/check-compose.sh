#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd -- "${script_dir}/../.." && pwd)"
cd "${repository_root}"

docker compose config --quiet
docker compose -f docker-compose.yml -f docker-compose.test.yml config --quiet
