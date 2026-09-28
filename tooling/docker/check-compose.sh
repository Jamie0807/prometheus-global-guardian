#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd -- "${script_dir}/../.." && pwd)"
cd "${repository_root}"

compose_file="${repository_root}/Docker/compose/docker-compose.yml"
test_compose_file="${repository_root}/Docker/compose/docker-compose.test.yml"
compose_env_args=()
if [[ -f "${repository_root}/.env" ]]; then
  compose_env_args+=(--env-file "${repository_root}/.env")
fi

docker compose "${compose_env_args[@]}" -f "${compose_file}" config --quiet
docker compose "${compose_env_args[@]}" -f "${compose_file}" -f "${test_compose_file}" config --quiet
