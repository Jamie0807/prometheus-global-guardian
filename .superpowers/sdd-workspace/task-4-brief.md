## Task 4: Route Analytics through the authenticated BFF

**Files:**

- Create: `server/analytics/analytics-route.ts`
- Modify: `server.ts`
- Modify: `src/services/analytics/analyticsService.ts`
- Modify: `python-analytics-service/security.py`
- Modify: `python-analytics-service/app/routes/analytics.py`
- Modify: `python-analytics-service/app/routes/quality.py`
- Modify: `python-analytics-service/app/routes/pivot.py`
- Modify: `python-analytics-service/app/main.py`
- Modify: `docker-compose.yml`
- Modify: `Dockerfile`
- Modify: `.env.example`
- Modify: `package.json` (`format:check` coverage for proxy modules)

**Interfaces:**

- Browser base path is same-origin `/api/analytics`; it never reads `VITE_PYTHON_API_URL`.
- BFF maps an explicit allowlist of the existing `GET /`, `GET /health`, `GET /api/v1/*` analysis paths to `ANALYTICS_SERVICE_URL` and forwards `X-Analytics-Service-Token` server-side.
- FastAPI `require_service_access` validates the token with constant-time comparison and is attached to all analytics, quality and pivot business routers; health remains unauthenticated, admin routes retain `AdminAccess`.

- [ ] Implement an allowlist proxy with method/path matching, 64 KiB request body limit, existing query constraints, upstream timeout and stable sanitized error envelopes.
- [ ] Add a shared Python dependency for the BFF service token, return 404 when unset/invalid, and apply it to all business endpoints without changing `/health`, `/metrics` and `/cache/clear` semantics.
- [ ] Replace Analytics `API_BASE_URL` references with `/api/analytics` routes, including service health/info checks and every `/api/v1/*` call.
- [ ] Add `ANALYTICS_SERVICE_URL` and `ANALYTICS_SERVICE_TOKEN` to `.env.example` and Compose; remove `VITE_PYTHON_API_URL` from client build arguments and stop publishing the Analytics container port to the host.
- [ ] Update Vite proxy to keep all `/api/*` calls same-origin through Express and retain local Python service access only from BFF.
- [ ] Run `pnpm run typecheck:server`, `pnpm run typecheck:client`, `pnpm run typecheck:contracts`, `pnpm run build`, `python3 -m compileall -q python-analytics-service/security.py python-analytics-service/app/routes/analytics.py python-analytics-service/app/routes/quality.py python-analytics-service/app/routes/pivot.py`, `pnpm run lint`, `pnpm run format:check` and `git diff --check`.
