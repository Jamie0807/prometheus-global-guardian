# Prometheus Global Guardian

Languages: [English](#english) | [中文](#中文)

---

## English

Prometheus Global Guardian is a local development project for global hazard monitoring, geospatial visualization, analytics, and AI-assisted incident assessment. It combines live hazard feeds into a shared model, displays the resulting situation on an interactive map, and provides analysis, reporting, and decision-support workflows.

The repository contains a React client, an Express BFF, a FastAPI analytics service, PostgreSQL-backed accounts and AI persistence, and integrations with external data and AI providers. It is not currently deployed. Docker Compose is supplied only to run the complete stack locally.

### Table of Contents

- [Platform Overview](#platform-overview)
- [Core Capabilities](#core-capabilities)
- [Architecture and Data Flow](#architecture-and-data-flow)
- [Service Topology](#service-topology)
- [Technology Stack](#technology-stack)
- [Runtime Requirements](#runtime-requirements)
- [Configuration](#configuration)
- [Local Development](#local-development)
- [Testing and Quality](#testing-and-quality)
- [Docker Compose](#docker-compose)
- [Python Analytics Service](#python-analytics-service)
- [AI Assistant Provider](#ai-assistant-provider)
- [Local Production Build](#local-production-build)
- [API Surface](#api-surface)
- [Data Sources](#data-sources)
- [Operational Notes](#operational-notes)
- [Security Notes](#security-notes)
- [Project Structure](#project-structure)

### Platform Overview

The platform is organized around four operational domains:

- **Hazard ingestion**: combines DisasterAware with USGS, NASA EONET, and GDACS feeds and normalizes them into `Hazard` records.
- **Geospatial operations**: renders active events with Mapbox GL markers, popups, heatmap mode, clickable clustering, optional 3D Tiles, and configurable base styles.
- **Analytics and reporting**: presents summaries, charts, risk and quality results from the Python service, then exports the current filtered hazards as a readable HTML report.
- **AI-assisted analysis**: sends live hazard context through a streaming BFF endpoint for situation summaries and response recommendations.
- **Accounts and AI persistence**: registers local/self-hosted accounts, gates application APIs by server-side sessions, and stores user-owned conversations, bounded context summaries, and user-approved long-term memory in PostgreSQL.

### Core Capabilities

#### Global Hazard Monitoring

- Displays active events from multiple authoritative or public sources.
- Filters earthquake, volcano, flood, wildfire, storm, drought, tsunami, and landslide records.
- Uses one `Hazard` model across mapping, analytics, AI context, and report export.
- Cleans and transforms hazard data in a Web Worker to reduce UI-thread pressure.
- Maintains cancellation and stale-response protection as filters or refreshes change.

#### Geospatial Visualization

- Interactive global map powered by Mapbox GL.
- Event markers and contextual popups, with clickable clusters that expand to individual events, plus heatmap rendering and zoom-sensitive clustering.
- Optional deck.gl / loaders.gl 3D Tiles overlay; Mapbox fill-extrusion buildings are the fallback when no tiles URL is configured.
- User-selectable Mapbox base style.

#### Analytics Workspace

- Statistical summaries plus type, severity, timeline, and source distribution charts.
- FastAPI-backed statistics, prediction, risk assessment, ETL, data quality, unified-model, and pivot workflows.
- Health, loading, cached-result, retry, empty-data, and error states.
- Typed presentation adapters for prediction availability, sample requirements, confidence, risk levels, trends, and quality scores.
- `zh-CN` and `en-US` result copy without changing the Python API response shape.

#### AI-Assisted Incident Analysis

- Streaming chat interface with current hazards inserted as context; the assistant bubble appears only after the first response text arrives.
- Quick prompts for global review, floods, seismic activity, wildfire threat, forecasting, and emergency response.
- BFF smart routing: disaster-domain questions can use ai-workflow; general conversation can use Volcengine Ark.
- Forced provider modes and a local demo fallback when no provider key is configured.
- Closing the assistant cancels its active stream. App-level Escape closes only report and settings modals; the AI component handles Escape itself to close and cancel its active stream.

#### Reporting and Notifications

- Downloads a readable HTML report containing report information, the selected filter, type totals, event details, and export time; it can be printed to PDF from a browser.
- Provides in-memory notification subscriptions and optional browser notifications when permission is granted.
- Includes settings, report, analytics, and AI workflows.

### Architecture and Data Flow

```mermaid
flowchart LR
  Browser["React client\nVite :5173"]
  BFF["Express BFF\n:8080"]
  Python["FastAPI analytics\nprivate :8001"]
  DB[("PostgreSQL")]
  Sources["DisasterAware · USGS\nNASA EONET · GDACS"]
  Workflow["ai-workflow"]
  Ark["Volcengine Ark"]

  Browser -->|"/api/auth/*\n/api/authorize\n/api/hazards/*\n/api/analytics/*\n/api/ai/conversations/*"| BFF
  BFF -->|"service token"| Python
  BFF --> DB
  BFF --> Sources
  BFF -->|disaster-domain route| Workflow
  BFF -->|general-conversation route| Ark
```

In local development, Vite serves the browser client on port `5173` and proxies `/api/*` to Express on `8080`. The browser sends analytics requests to the authenticated BFF; Express forwards an explicit allowlist to FastAPI over the private service network using a service token. Express also owns account sessions and AI conversation persistence in PostgreSQL. Browser assets never receive database credentials, session tokens, analytics service tokens, DisasterAware credentials, upstream access tokens, or model-provider secrets.

Frontend state ownership is deliberately small and explicit:

- `MapStateProvider` owns hazards, the hazard filter, map style, source metadata, and refresh behavior. It retains the data hook's worker lifecycle, cancellation, and stale-response protection.
- `UIStateProvider` owns `activeView` (`map` or `analytics`) and `activeModal` (`save-report`, `settings`, `ai`, or `null`).
- `AuthProvider` resolves the server-side user session before mounting protected application state. `App` composes providers, handles Escape for report/settings modals, and selects the map or analytics view. Mapbox instances, AI session state, and analytics-fetch state remain in their feature boundaries.

### Service Topology

| Service                        | Runtime | Default port | Responsibility                                                                               |
| ------------------------------ | ------: | -----------: | -------------------------------------------------------------------------------------------- |
| React / Vite client            | Node.js |         5173 | Local frontend development server                                                            |
| Express BFF                    | Node.js |         8080 | Static files, user sessions, hazard aggregation, analytics proxy, AI routing and persistence |
| PostgreSQL                     |     SQL |         5432 | Accounts, sessions, conversations, messages and memory                                       |
| Python analytics service       |  Python |         8001 | Internal analysis, prediction, risk, ETL, quality and pivot APIs                             |
| External data and AI providers |    SaaS |        HTTPS | Hazard feeds and streaming model responses                                                   |

### Technology Stack

#### Frontend

| Technology              | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| React 19 and TypeScript | Components, UI state, and application contracts  |
| Vite                    | Local development server and build               |
| Mapbox GL               | Interactive mapping                              |
| deck.gl / loaders.gl    | Optional 3D Tiles integration                    |
| Recharts                | Analytics visualizations                         |
| DOMPurify               | Sanitization before assistant output is rendered |

#### Backend and Analytics

| Technology          | Purpose                                   |
| ------------------- | ----------------------------------------- |
| Express 5           | BFF and local static application server   |
| FastAPI             | Python analytics HTTP service             |
| Pandas / NumPy      | Data processing and numerical computation |
| SciPy / Statsmodels | Statistical analysis                      |
| Scikit-learn        | Prediction and modeling workflows         |

### Runtime Requirements

| Runtime | Version                        |
| ------- | ------------------------------ |
| Node.js | `20.19.x` in the 20.x line     |
| pnpm    | `10.15.1`                      |
| Python  | 3.13 recommended for analytics |

The repository contains `.nvmrc`. Project scripts use `tooling/node/with-node-version.sh` to select that version when nvm is available. Docker images already provide Node.js 20.19.0.

### Configuration

Create a local environment file before starting services:

```bash
cp .env.example .env
```

Before starting the Compose stack, replace the placeholder `AUTH_CSRF_SECRET` and `ANALYTICS_SERVICE_TOKEN` with independent values from `openssl rand -base64 48`. Production mode rejects the CSRF placeholder. Keep the sample PostgreSQL password only for local use.

#### Frontend values

```dotenv
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
VITE_LOG_LEVEL=debug
VITE_3D_TILES_URL=
VITE_CESIUM_ION_TOKEN=
```

`VITE_` values are embedded in browser assets at build time. Use them only for public configuration; rebuild after changing them.

#### BFF and external-provider values

```dotenv
DISASTERAWARE_USERNAME=your_username_here
DISASTERAWARE_PASSWORD=your_password_here
DISASTERAWARE_REQUEST_TIMEOUT_MS=10000
BFF_AUTHORIZE_RATE_LIMIT_MAX=10
BFF_AI_RATE_LIMIT_MAX=30
BFF_HAZARD_RATE_LIMIT_MAX=120
# AI SSE 断连恢复的单实例短时内存会话上限
BFF_AI_STREAM_RESUME_TTL_MS=30000
BFF_AI_STREAM_RESUME_MAX_EVENTS=256
BFF_AI_STREAM_RESUME_MAX_BYTES=524288
BFF_AI_STREAM_RESUME_MAX_SESSIONS=100
LOG_LEVEL=info

AI_PROVIDER=router
VOLCENGINE_WORKFLOW_API_URL=http://localhost:3100/api/v1/apps/run
VOLCENGINE_WORKFLOW_API_KEY=
VOLCENGINE_ARK_API_KEY=
VOLCENGINE_ARK_MODEL=ark-code-latest
VOLCENGINE_ARK_API_URL=https://ark.cn-beijing.volces.com/api/plan/v3
VOLCENGINE_ARK_TIMEOUT_MS=30000

DATABASE_URL=postgresql://prometheus:prometheus@localhost:5432/prometheus?schema=public
AUTH_CSRF_SECRET=replace_with_random_secret_at_least_32_characters
PUBLIC_ORIGIN=https://guardian.example.com
ANALYTICS_SERVICE_URL=http://localhost:8001
ANALYTICS_SERVICE_TOKEN=replace_with_a_random_service_secret
```

These values are read by Express at runtime and must never use a `VITE_` prefix. `AI_PROVIDER=router` enables smart routing; use `workflow` or `ark` to force one provider while troubleshooting. If the workflow runs on the macOS host while Express runs in Docker, set its URL to `http://host.docker.internal:3100/api/v1/apps/run`.

PostgreSQL is required for account and AI persistence. Generate `AUTH_CSRF_SECRET` and `ANALYTICS_SERVICE_TOKEN` with `openssl rand -base64 48`; replace the local-only PostgreSQL password before exposing a self-hosted instance. Keep all three values server-side.

When TLS terminates at a reverse proxy, set `PUBLIC_ORIGIN` to the exact browser-facing origin (scheme and host, with no path). This lets the BFF validate browser mutations and mark the session cookie `Secure` without trusting forwarded headers. Leave it unset for direct local development.

#### Analytics administration values

```dotenv
ANALYTICS_ADMIN_TOKEN=
ANALYTICS_CORS_ORIGINS=
APP_ENV=production
```

`ANALYTICS_ADMIN_TOKEN` enables Python management routes and must stay server-side. `ANALYTICS_CORS_ORIGINS` is a comma-separated allowlist for non-local browser origins. See the [Python Analytics Service README](services/analytics/README.md) for the complete boundary and request contract.

#### Logging and diagnostic output

`VITE_LOG_LEVEL` and `LOG_LEVEL` accept `debug`, `info`, `warn`, `error`, and `silent`. Browser development defaults to `debug`, browser production to `warn`, and BFF/Python production to `info`. Logs use safe event context such as status, duration, count, and request ID. Do not log credentials, tokens, headers, request/response bodies, exception messages, or stacks.

### Local Development

Install dependencies:

```bash
pnpm install
```

Start the Express BFF in one terminal:

```bash
pnpm run build:server
pnpm run db:migrate:deploy
node dist-server/apps/bff/index.js
```

Start the frontend in another terminal:

```bash
pnpm run dev
```

Open `http://localhost:5173`. Start the Python service whenever analytics features are needed:

```bash
./services/analytics/start-service.sh
```

For direct local development, set `DATABASE_URL` to a local PostgreSQL database and `ANALYTICS_SERVICE_URL=http://localhost:8001` in `.env`. Apply the checked-in schema with `pnpm run db:migrate:deploy` before starting Express. Registration is intended for local or privately operated instances; email verification, password reset, OAuth and public-service abuse controls are not included.

### Testing and Quality

Run the relevant layer while developing:

```bash
pnpm run test:services
pnpm run test:component
pnpm run test:python
```

The current automated suites contain 194 frontend Service tests, 81 React component tests, and 49 Python unittest cases. They cover request and contract boundaries, hazard transformation, analytics presentation, versioned analytics response envelopes, AI streaming and resumable sessions, report generation, map/UI state ownership, FastAPI routes, and analysis-result semantics. Component tests use Vitest, React Testing Library, and jsdom; Python tests do not require a running analytics service or real external data.

Useful commands:

```bash
pnpm test
pnpm run test:bff
pnpm run test:e2e
pnpm run test:baseline
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run build
```

`pnpm test` runs the BFF and Service unit groups. In restricted sandboxes, the BFF subset can fail with `listen EPERM: operation not permitted 0.0.0.0` because Node cannot bind a local test port; this is an environment limitation. Run component, Service, and Python commands separately when that restriction applies. CI runs the Node quality baseline and Python test job; see [docs/TESTING_BASELINE.md](docs/TESTING_BASELINE.md) for command boundaries.

### Docker Compose

Docker Compose is a **local complete-stack startup** path. It does not represent a deployment configuration.

```bash
pnpm run check:docker
docker compose up --build -d
docker compose exec web pnpm run db:migrate:deploy
```

`pnpm run check:docker` validates both Compose configurations without starting containers. Open `http://localhost:8080`. FastAPI stays private to the Compose network; PostgreSQL publishes `5432` for local tools such as DataGrip. The isolated test overlay uses `127.0.0.1:55439` and a separate volume. Check services with `docker compose ps` and `docker compose logs -f analytics db`. Stop with `docker compose down`.

The web container exposes 8080 and Analytics does not publish a host port. Analytics requests go through the authenticated BFF and its private service token. Compose passes public `VITE_*` build values to the client build; database, session, analytics service, DisasterAware and AI values remain server-side. The sample database password is for local use only. Back up the PostgreSQL volume before upgrades or maintenance; the migration command is explicit and is not run automatically by startup. For a local SQL backup and restore:

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > ./prometheus-backup.sql
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < ./prometheus-backup.sql
```

Protect backup files as user data and store them separately from the Compose volume.

### Python Analytics Service

FastAPI is an internal analytics service. `/`, `/health`, `/docs`, and `/redoc` are available on its service network; business `/api/v1/*` requests require the BFF service token and are proxied through `/api/analytics`. `/metrics` and `/cache/clear` remain management endpoints and require `X-Analytics-Admin-Token` when enabled.

Read [services/analytics/README.md](services/analytics/README.md) for startup instructions, request format, endpoint groups, analysis semantics, and the Python test suite.

### AI Assistant Provider

The browser sends new messages to `POST /api/ai/conversations/:id/messages`; Express loads the user-owned conversation, applies bounded context and approved memories, then streams and persists the result. `POST /api/ai/cancel` stops an active generation for the current user. Conversation history is restored after reload. Memory suggestions are generated only on explicit user action and are not used until accepted. With `AI_PROVIDER=router`, disaster-domain analysis can go to ai-workflow and general conversation can go to Volcengine Ark. The BFF supports Ark's OpenAI-compatible Chat Completions and Responses protocols. If no provider is configured, the existing local demo reply remains available; provider-backed assistant output is stored server-side.

### Local Production Build

Build the client and Express BFF artifacts:

```bash
pnpm run build
```

Start the locally built application server:

```bash
pnpm start
```

It listens on `http://localhost:8080` by default. `pnpm run start:static` serves only the static client. These commands support local verification; this repository currently has no deployment workflow.

### API Surface

#### Express BFF

| Endpoint                             | Method                    | Purpose                                                                          |
| ------------------------------------ | ------------------------- | -------------------------------------------------------------------------------- |
| `/api/authorize`                     | `POST`                    | Uses server-side DisasterAware credentials and returns authorization status only |
| `/api/auth/register`                 | `POST`                    | Creates a local account and server-side session                                  |
| `/api/auth/login`                    | `POST`                    | Starts an authenticated session                                                  |
| `/api/auth/session`                  | `GET`                     | Restores the current browser session                                             |
| `/api/auth/logout`                   | `POST`                    | Revokes the current session                                                      |
| `/api/auth/account`                  | `PATCH` / `DELETE`        | Updates memory preference or deletes the account and owned data                  |
| `/api/hazards`                       | `GET`                     | Aggregates public hazard feeds; supports `source` and `type` filters             |
| `/api/ai/conversations*`             | `GET` / `POST` / `DELETE` | Manages only the signed-in user's conversations and messages                     |
| `/api/ai/conversations/:id/messages` | `POST`                    | Streams and persists an AI response                                              |
| `/api/ai/memories*`                  | Various                   | Manages user-approved long-term memory                                           |
| `/api/analytics/*`                   | Various                   | Proxies allowlisted analytics calls to private FastAPI                           |
| `/api/hazards/types`                 | `GET`                     | Proxies the authenticated DisasterAware type endpoint                            |
| `/api/hazards/active`                | `GET`                     | Proxies authenticated active hazards                                             |
| `/api/hazards/active/category/:id`   | `GET`                     | Proxies authenticated category hazards                                           |
| Other `/api/*`                       | Any                       | Returns a stable 404 or 405; arbitrary upstream proxying is not supported        |

#### Python analytics

| Group                     | Endpoints                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service and management    | `GET /`, `GET /health`, `GET /metrics`, `POST /cache/clear`                                                                                                           |
| Basic analysis            | `POST /api/v1/analyze`, `/statistics`, `/predictions`, `/risk-assessment`, `/etl/process`                                                                             |
| Quality and unified model | `POST /api/v1/quality/assess`, `GET /api/v1/quality/thresholds`, `GET /api/v1/quality/history`, `POST /api/v1/unified-model/transform`, `/api/v1/unified-model/merge` |
| Pivot workflows           | `POST /api/v1/pivot/create`, `/query`, `/trend-analysis`, `/risk-score`, `/summary`                                                                                   |

All `/api/v1` business endpoints return a versioned response envelope. Successful responses include `schemaVersion`, `requestId`, `generatedAt`, `modelVersion`, `inputSnapshotId`, `warnings`, `processingTime`, and the compatibility alias `timestamp`; validation and internal failures use the stable `ANALYTICS_VALIDATION_ERROR` or `ANALYTICS_INTERNAL_ERROR` error envelope. Shared examples live in `packages/contracts/analytics-response-envelope.json` and `packages/contracts/analytics-error-envelope.json`.

### Data Sources

| Source        | Scope                       | Use                                                          |
| ------------- | --------------------------- | ------------------------------------------------------------ |
| DisasterAware | Active hazard and type APIs | Authenticated primary source when credentials are available  |
| USGS          | Earthquake GeoJSON          | Fallback and aggregation source                              |
| NASA EONET    | Environmental events        | Wildfire, volcano, flood, storm, drought, and landslide data |
| GDACS         | Global alerts               | Alert and coordination data                                  |

### Operational Notes

- The map and public-hazard workflow can work when FastAPI is offline; analytics panels show their own offline or error states.
- A valid `VITE_MAPBOX_TOKEN` is required for Mapbox rendering.
- `dist/` and `dist-server/` are generated local build artifacts.
- New feature work uses an isolated Git worktree by default. Behavior changes follow TDD: a failing test first, minimal implementation, then test-protected refactoring.
- The current project state is local development and quality governance, not deployment.

### Security Notes

- `.env` is ignored by Git and must not be committed.
- Never place server secrets under `VITE_`; those values become browser-visible build inputs.
- The BFF allowlists DisasterAware routes and headers, limits request bodies, validates query shapes, applies process-local rate limits, and returns sanitized upstream errors.
- Management tokens, DisasterAware credentials, and model-provider keys stay in server environments and out of logs, frontend bundles, and exported reports.

### Project Structure

```text
prometheus-global-guardian/
├── apps/web/
│   ├── index.html              # Browser HTML entry
│   └── src/
│       ├── features/           # Map and Analytics features
│       ├── state/              # Authentication and UI state providers
│       ├── services/           # Frontend HTTP, hazard, AI, auth, and analytics boundaries
│       ├── components/         # Shared React components and modals
│       ├── workers/            # Hazard processing Web Worker
│       └── App.tsx             # Authentication gate and provider/view composition
├── apps/bff/
│   ├── index.ts                 # Express application entry
│   ├── ai/                      # Provider routing, persistent conversations, and memory
│   ├── auth/                    # Account endpoints, password hashing, and sessions
│   ├── db/                      # Prisma/PostgreSQL client
│   ├── analytics/               # Authenticated Analytics proxy
│   ├── hazards/                 # Public-feed aggregation
│   └── security/                # BFF request boundaries
├── services/analytics/
│   ├── app/                     # FastAPI factory, routes, schemas, and services
│   ├── analytics/               # Statistics, prediction, risk, quality, ETL, and pivot logic
│   └── tests/                   # Python unittest suite
├── packages/
│   ├── contracts/               # Language-neutral JSON contracts shared by TypeScript and Python
│   ├── hazard-domain/           # Runtime-independent TypeScript hazard model and registry
│   └── logging/                 # Shared logging API for Web and BFF
├── apps/web/tests/              # Web Service, component, and E2E tests
├── apps/bff/tests/              # BFF Node and service tests
├── tests/integration/           # Cross-runtime integration tests
├── infra/persistence/tests/     # Persistence operations tests
├── prisma/                      # PostgreSQL schema and explicit migrations
├── docs/                        # Governance, test baseline, plans, and specifications
├── tooling/                     # Node-version, architecture, and Docker config tools
├── package.json                  # Repository scripts and workspace dependency orchestration
├── vite.config.ts                # Web root and root dist/ output
├── vitest.config.ts              # Service test configuration
├── playwright.config.ts          # Browser test configuration
├── Dockerfile                    # Local complete-stack image
├── services/analytics/Dockerfile # Analytics service image
├── docker-compose.yml           # Local complete-stack startup
├── docker-compose.test.yml      # Isolated test database overlay
├── .dockerignore                # Build context exclusions
└── AGENTS.md                    # Development, worktree, TDD, and validation conventions
```

The Web runtime lives in `apps/web/`, with implementation under `apps/web/src/`. The BFF runtime lives in `apps/bff/`, with `apps/bff/index.ts` as its entrypoint. The Analytics runtime lives in `services/analytics/`, with `main.py` retained as its direct and Uvicorn entrypoint. Vite builds from `apps/web/index.html` into the repository root `dist/`, which Express serves. The repository root retains the package scripts, Vite, Vitest, Playwright, and Dockerfile orchestration. Web and BFF production code import the hazard model through the public `@pgg/hazard-domain` entrypoint; the removed shared hazard compatibility layer is no longer part of the runtime boundary.

---

## 中文

Prometheus Global Guardian 是一个用于本地开发的全球灾害监测、地理态势可视化、数据分析和 AI 辅助研判项目。它把实时灾害数据源统一为共享模型，在交互式地图上呈现态势，并提供风险复盘、分析、报告和决策支持工作流。

仓库包含 React 前端、Express BFF、FastAPI 分析服务、PostgreSQL 账号与 AI 数据持久化，以及外部数据源和 AI 服务集成。当前未部署；Docker Compose 仅用于在本地启动完整技术栈。

### 目录

- [平台概览](#平台概览)
- [核心能力](#核心能力)
- [架构与数据流](#架构与数据流)
- [服务拓扑](#服务拓扑)
- [技术栈](#技术栈)
- [运行环境](#运行环境)
- [配置](#配置)
- [本地开发](#本地开发)
- [测试与质量](#测试与质量)
- [Docker Compose](#docker-compose-1)
- [Python 分析服务](#python-分析服务)
- [AI 助手服务](#ai-助手服务)
- [本地生产构建](#本地生产构建)
- [API 接口](#api-接口)
- [数据源](#数据源)
- [运行说明](#运行说明)
- [安全说明](#安全说明)
- [项目结构](#项目结构)

### 平台概览

平台围绕四个业务域组织：

- **灾害接入**：整合 DisasterAware、USGS、NASA EONET 和 GDACS，并统一为 `Hazard` 记录。
- **地理态势**：以 Mapbox GL 呈现活动事件、标记、弹窗、热力图、可点击展开的聚合、可选 3D Tiles 和可配置底图。
- **分析与报告**：调用 Python 服务呈现统计、图表、风险和质量结果，并把当前筛选后的灾害数据导出为可读 HTML 报告。
- **AI 辅助研判**：将实时灾害上下文送入流式 BFF 接口，生成态势摘要和响应建议。
- **账号与 AI 持久化**：支持本地/自托管账号注册，全站 API 按服务端会话鉴权；会话、对话、上下文摘要和用户确认的长期记忆保存在 PostgreSQL。

### 核心能力

#### 全球灾害监测

- 展示多个权威或公开数据源的活动事件。
- 筛选地震、火山、洪水、野火、风暴、干旱、海啸和滑坡。
- 地图、分析、AI 上下文和报告导出共用 `Hazard` 模型。
- 通过 Web Worker 清洗和转换灾害数据，减少 UI 线程压力。
- 筛选或刷新改变时保留请求取消和陈旧响应保护。

#### 地理态势可视化

- 基于 Mapbox GL 的交互式全球地图。
- 事件标记与上下文弹窗；点击聚合点会放大展开为单个事件，并支持热力图和随缩放变化的聚合。
- 支持 deck.gl / loaders.gl 3D Tiles；未配置 Tiles 时可回退至 Mapbox 建筑挤出层。
- 可选择 Mapbox 底图样式。

#### 分析工作台

- 展示统计摘要，以及类型、严重程度、时间线和数据源分布图表。
- 通过 FastAPI 执行统计、预测、风险评估、ETL、数据质量、统一模型和透视分析。
- 覆盖服务健康、加载、缓存、重试、空数据和错误状态。
- 以类型化展示适配器处理预测可用性、样本要求、置信度、风险等级、趋势和质量分数。
- 提供 `zh-CN` 与 `en-US` 文案资源，而不改变 Python API 响应结构。

#### AI 辅助研判

- 流式聊天界面会注入当前灾害上下文，首段回答到达前不显示空白助手气泡。
- 提供全球态势、洪水风险、地震活动、野火威胁、预测和应急响应等快捷提示。
- BFF 智能路由可把灾害领域问题送给 ai-workflow，把通用对话送给火山方舟。
- 支持强制指定 Provider；未配置模型 Key 时使用本地演示回复。
- 关闭助手会取消正在进行的流。App 级 Escape 只关闭报告和设置弹窗；AI 组件自身处理 Escape，关闭助手并取消正在进行的流。

#### 账号与 AI 持久化

- 注册和登录后由 Express 通过 HttpOnly Cookie 恢复全站会话，受保护的业务 API 均按当前用户授权。
- PostgreSQL 保存用户账号、会话、AI 对话和消息；新设备/刷新页面后可继续查看自己的历史对话。
- 对话上下文有大小上限；较早消息会进入摘要，不会从原始会话记录中删除。
- 长期记忆需用户主动生成建议并逐条确认；用户可编辑、停用或删除记忆。
- 注册面向本地或私有运营实例；不包含邮箱验证、密码找回、OAuth 和公网滥用防护。

#### 报告与通知

- 下载可读 HTML 报告，包含报告信息、筛选条件、类型汇总、灾害明细和导出时间；可在浏览器中打印为 PDF。
- 提供内存通知订阅，浏览器授予权限后可使用系统通知。
- 包含设置、报告、分析和 AI 工作流。

### 架构与数据流

```mermaid
flowchart LR
  Browser["React 客户端\nVite :5173"]
  BFF["Express BFF\n:8080"]
  Python["FastAPI 分析服务\n私有 :8001"]
  DB[("PostgreSQL")]
  Sources["DisasterAware · USGS\nNASA EONET · GDACS"]
  Workflow["ai-workflow"]
  Ark["Volcengine Ark"]

  Browser -->|"/api/auth/*\n/api/authorize\n/api/hazards/*\n/api/analytics/*\n/api/ai/conversations/*"| BFF
  BFF -->|"服务间令牌"| Python
  BFF --> DB
  BFF --> Sources
  BFF -->|灾害领域路由| Workflow
  BFF -->|通用对话路由| Ark
```

本地开发时，Vite 在 `5173` 提供浏览器客户端，并把 `/api/*` 转发到 `8080` 的 Express。浏览器通过已鉴权的 BFF 请求分析数据；Express 使用服务间令牌将允许的请求转发到私有网络中的 FastAPI。Express 还负责账号会话及 PostgreSQL 中的 AI 对话持久化。浏览器构建产物不会获得数据库凭据、会话令牌、分析服务令牌、DisasterAware 凭据、上游 token 或模型服务密钥。

前端状态归属保持小而明确：

- `MapStateProvider` 负责灾害数据、筛选条件、地图样式、来源元信息和刷新；其内部数据 Hook 保留 Worker 生命周期、取消逻辑和陈旧响应保护。
- `UIStateProvider` 负责 `activeView`（`map` 或 `analytics`）和 `activeModal`（`save-report`、`settings`、`ai` 或 `null`）。
- `AuthProvider` 在挂载受保护的应用状态前恢复服务端用户会话。`App` 负责 Provider 组合、报告/设置弹窗的 Escape 行为，以及地图和分析视图的选择。Mapbox 实例、AI 会话和分析请求状态各自在功能边界内管理。

### 服务拓扑

| 服务                |  运行时 | 默认端口 | 职责                                               |
| ------------------- | ------: | -------: | -------------------------------------------------- |
| React / Vite 客户端 | Node.js |     5173 | 本地前端开发服务                                   |
| Express BFF         | Node.js |     8080 | 静态文件、用户会话、灾害聚合、分析代理和 AI 持久化 |
| PostgreSQL          |     SQL |     5432 | 账号、会话、对话、消息与记忆                       |
| Python 分析服务     |  Python |     8001 | 内部分析、预测、风险、ETL、质量和透视接口          |
| 外部数据与 AI 服务  |    SaaS |    HTTPS | 灾害数据与流式模型响应                             |

### 技术栈

#### 前端

| 技术                   | 用途                    |
| ---------------------- | ----------------------- |
| React 19 与 TypeScript | 组件、UI 状态和应用契约 |
| Vite                   | 本地开发服务和构建      |
| Mapbox GL              | 交互式地图              |
| deck.gl / loaders.gl   | 可选 3D Tiles 集成      |
| Recharts               | 分析图表                |
| DOMPurify              | 助手输出渲染前的净化    |

#### 后端与分析

| 技术                | 用途                   |
| ------------------- | ---------------------- |
| Express 5           | BFF 和本地静态应用服务 |
| FastAPI             | Python 分析 HTTP 服务  |
| Pandas / NumPy      | 数据处理和数值计算     |
| SciPy / Statsmodels | 统计分析               |
| Scikit-learn        | 预测和建模流程         |

### 运行环境

| 运行时  | 版本                  |
| ------- | --------------------- |
| Node.js | 20.x 中的 `20.19.x`   |
| pnpm    | `10.15.1`             |
| Python  | 分析服务建议使用 3.13 |

仓库包含 `.nvmrc`。在 nvm 可用时，项目脚本通过 `tooling/node/with-node-version.sh` 使用对应版本；Docker 镜像已内置 Node.js 20.19.0。

### 配置

启动服务前创建本地环境文件：

```bash
cp .env.example .env
```

启动 Compose 前，请将占位的 `AUTH_CSRF_SECRET` 和 `ANALYTICS_SERVICE_TOKEN` 替换为 `openssl rand -base64 48` 生成的不同随机值。生产模式会拒绝 CSRF 占位密钥。示例 PostgreSQL 密码只用于本地。

#### 前端变量

```dotenv
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
VITE_LOG_LEVEL=debug
VITE_3D_TILES_URL=
VITE_CESIUM_ION_TOKEN=
```

`VITE_` 变量在构建时写入浏览器产物，只能放置可公开配置；修改后需要重新构建。

#### BFF 与外部服务变量

```dotenv
DISASTERAWARE_USERNAME=your_username_here
DISASTERAWARE_PASSWORD=your_password_here
DISASTERAWARE_REQUEST_TIMEOUT_MS=10000
BFF_AUTHORIZE_RATE_LIMIT_MAX=10
BFF_AI_RATE_LIMIT_MAX=30
BFF_HAZARD_RATE_LIMIT_MAX=120
# AI SSE 断连恢复的单实例短时内存会话上限
BFF_AI_STREAM_RESUME_TTL_MS=30000
BFF_AI_STREAM_RESUME_MAX_EVENTS=256
BFF_AI_STREAM_RESUME_MAX_BYTES=524288
BFF_AI_STREAM_RESUME_MAX_SESSIONS=100
LOG_LEVEL=info

AI_PROVIDER=router
VOLCENGINE_WORKFLOW_API_URL=http://localhost:3100/api/v1/apps/run
VOLCENGINE_WORKFLOW_API_KEY=
VOLCENGINE_ARK_API_KEY=
VOLCENGINE_ARK_MODEL=ark-code-latest
VOLCENGINE_ARK_API_URL=https://ark.cn-beijing.volces.com/api/plan/v3
VOLCENGINE_ARK_TIMEOUT_MS=30000

DATABASE_URL=postgresql://prometheus:prometheus@localhost:5432/prometheus?schema=public
AUTH_CSRF_SECRET=replace_with_random_secret_at_least_32_characters
PUBLIC_ORIGIN=https://guardian.example.com
ANALYTICS_SERVICE_URL=http://localhost:8001
ANALYTICS_SERVICE_TOKEN=replace_with_a_random_service_secret
```

这些变量由 Express 在运行时读取，不能使用 `VITE_` 前缀。`AI_PROVIDER=router` 启用智能路由；排查问题时可使用 `workflow` 或 `ark` 强制单一 Provider。若工作流运行在 macOS 主机、Express 运行在 Docker 中，应把工作流 URL 设为 `http://host.docker.internal:3100/api/v1/apps/run`。

账号和 AI 持久化需要 PostgreSQL。使用 `openssl rand -base64 48` 生成 `AUTH_CSRF_SECRET` 与 `ANALYTICS_SERVICE_TOKEN`；对外开放自托管实例前替换仅供本地使用的数据库密码。以上值都只能保留在服务端。

如果 TLS 在反向代理终止，请将 `PUBLIC_ORIGIN` 设置为浏览器实际访问的完整源（协议和主机，不带路径）。BFF 会使用它校验浏览器写请求并设置 `Secure` 会话 Cookie，无需信任转发头。本地直连开发时留空即可。

#### 分析服务管理变量

```dotenv
ANALYTICS_ADMIN_TOKEN=
ANALYTICS_CORS_ORIGINS=
APP_ENV=production
```

`ANALYTICS_ADMIN_TOKEN` 用于启用 Python 管理接口，必须只存在于服务端。`ANALYTICS_CORS_ORIGINS` 为非本地浏览器来源提供逗号分隔的显式允许列表。完整边界和请求约定见 [Python 分析服务 README](services/analytics/README.md)。

#### 日志与调试输出

`VITE_LOG_LEVEL` 和 `LOG_LEVEL` 支持 `debug`、`info`、`warn`、`error`、`silent`。浏览器开发默认 `debug`，浏览器生产默认 `warn`，BFF/Python 生产默认 `info`。日志仅记录状态、耗时、数量和请求 ID 等安全上下文，不记录凭据、token、请求头、请求/响应正文、异常消息或堆栈。

### 本地开发

安装依赖：

```bash
pnpm install
```

在一个终端启动 Express BFF：

```bash
pnpm run build:server
pnpm run db:migrate:deploy
node dist-server/apps/bff/index.js
```

在另一个终端启动前端：

```bash
pnpm run dev
```

访问 `http://localhost:5173`。需要分析功能时启动 Python 服务：

```bash
./services/analytics/start-service.sh
```

直接本地开发时，在 `.env` 中把 `DATABASE_URL` 指向本机 PostgreSQL，并设置 `ANALYTICS_SERVICE_URL=http://localhost:8001`。启动 Express 前先执行仓库迁移 `pnpm run db:migrate:deploy`。注册功能面向本地或私有运营实例；当前不包含邮箱验证、密码找回、OAuth 或公网滥用防护。

### 测试与质量

开发中按改动范围运行对应测试：

```bash
pnpm run test:services
pnpm run test:component
pnpm run test:python
```

当前自动化套件包含 194 项前端 Service 测试、81 项 React 组件测试和 49 项 Python unittest。覆盖请求与契约边界、灾害转换、分析展示、版本化 Analytics 响应信封、AI 流式处理与可恢复会话、报告生成、地图/UI 状态归属、FastAPI 路由和分析结果语义。组件测试使用 Vitest、React Testing Library 和 jsdom；Python 测试不要求启动分析服务，也不访问真实外部数据。

常用命令：

```bash
pnpm test
pnpm run test:bff
pnpm run test:e2e
pnpm run test:baseline
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run build
```

`pnpm test` 会运行 BFF 与 Service 单元测试。在受限沙箱中，BFF 子集可能因 Node 无法绑定本地测试端口而报 `listen EPERM: operation not permitted 0.0.0.0`；这是运行环境限制。出现该限制时，可单独运行组件、Service 和 Python 测试。CI 会执行 Node 质量基线和 Python 测试任务；命令边界见 [docs/TESTING_BASELINE.md](docs/TESTING_BASELINE.md)。

### Docker Compose

Docker Compose 是**本地完整栈启动方式**，不代表部署配置。

```bash
pnpm run check:docker
docker compose up --build -d
docker compose exec web pnpm run db:migrate:deploy
```

`pnpm run check:docker` 会在不启动容器的情况下校验两套 Compose 配置。访问 `http://localhost:8080`。FastAPI 只在 Compose 私有网络中可用；PostgreSQL 默认发布 `5432`，可供 DataGrip 等本地工具连接。隔离测试覆盖使用 `127.0.0.1:55439` 和独立数据卷。用 `docker compose ps` 查看状态，用 `docker compose logs -f analytics db` 查看日志，用 `docker compose down` 停止本地栈。

Web 容器暴露 8080，Analytics 不发布主机端口。分析请求经已鉴权的 BFF 和私有服务令牌转发。Compose 只将公开的 `VITE_*` 构建变量传入客户端构建；数据库、会话、分析服务、DisasterAware 和 AI 配置都保留在服务端。示例数据库密码仅供本地使用。升级或维护前先备份 PostgreSQL 数据卷；迁移命令需显式执行，不会随服务启动自动运行。

本地 SQL 备份与恢复示例：

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > ./prometheus-backup.sql
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < ./prometheus-backup.sql
```

备份文件包含用户数据，应妥善保护，并与 Compose 数据卷分开保存。

本地 SQL 备份与恢复示例：

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > ./prometheus-backup.sql
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < ./prometheus-backup.sql
```

备份文件包含用户数据，应妥善保护，并与 Compose 数据卷分开保存。

### Python 分析服务

FastAPI 是内部分析服务。`/`、`/health`、`/docs` 和 `/redoc` 可在服务网络中访问；业务 `/api/v1/*` 请求要求 BFF 服务令牌，并通过 `/api/analytics` 代理。`/metrics` 和 `/cache/clear` 仍是管理接口，启用后要求 `X-Analytics-Admin-Token`。

请阅读 [services/analytics/README.md](services/analytics/README.md)，其中包含启动方法、请求结构、接口分组、分析语义和 Python 测试说明。

### AI 助手服务

浏览器向 `POST /api/ai/conversations/:id/messages` 提交新消息；Express 读取当前用户自己的对话，组装有长度上限的上下文和已确认记忆，再流式返回并持久化回复。`POST /api/ai/cancel` 会停止当前用户正在进行的生成。刷新后可以恢复对话。只有用户主动发起时才生成记忆建议，接受后才会用于后续上下文。使用 `AI_PROVIDER=router` 时，灾害分析可路由至 ai-workflow，通用对话可路由至火山方舟；如果 Ark 未配置，后台摘要和记忆任务会回退到已配置的工作流。BFF 支持 Ark 的 OpenAI 兼容 Chat Completions 与 Responses 协议。未配置 Provider 时仍可使用本地演示回复；真实 Provider 的助手回复保存在服务端。

### 本地生产构建

构建前端和 Express BFF 产物：

```bash
pnpm run build
```

启动本地构建后的应用服务：

```bash
pnpm start
```

默认监听 `http://localhost:8080`。`pnpm run start:static` 只提供静态客户端。以上命令用于本地验证；当前仓库没有部署流程。

### API 接口

#### Express BFF

| 接口                                 | 方法                      | 作用                                           |
| ------------------------------------ | ------------------------- | ---------------------------------------------- |
| `/api/authorize`                     | `POST`                    | 使用服务端 DisasterAware 凭据，只返回鉴权状态  |
| `/api/auth/register`                 | `POST`                    | 创建本地账号和服务端会话                       |
| `/api/auth/login`                    | `POST`                    | 建立已鉴权会话                                 |
| `/api/auth/session`                  | `GET`                     | 恢复当前浏览器会话                             |
| `/api/auth/logout`                   | `POST`                    | 撤销当前会话                                   |
| `/api/auth/account`                  | `PATCH` / `DELETE`        | 修改记忆偏好或删除账号及其数据                 |
| `/api/hazards`                       | `GET`                     | 聚合公开灾害数据，支持 `source` 和 `type` 筛选 |
| `/api/ai/conversations*`             | `GET` / `POST` / `DELETE` | 管理当前用户自己的对话和消息                   |
| `/api/ai/conversations/:id/messages` | `POST`                    | 流式生成并保存 AI 回复                         |
| `/api/ai/memories*`                  | 多种                      | 管理用户确认的长期记忆                         |
| `/api/analytics/*`                   | 多种                      | 代理允许的请求到私有 FastAPI                   |
| `/api/hazards/types`                 | `GET`                     | 代理已鉴权的 DisasterAware 类型接口            |
| `/api/hazards/active`                | `GET`                     | 代理已鉴权的活动灾害接口                       |
| `/api/hazards/active/category/:id`   | `GET`                     | 代理已鉴权的分类灾害接口                       |
| 其他 `/api/*`                        | Any                       | 返回稳定的 404 或 405，不支持任意上游代理      |

#### Python 分析服务

| 分组           | 接口                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 服务与管理     | `GET /`、`GET /health`、`GET /metrics`、`POST /cache/clear`                                                                                                           |
| 基础分析       | `POST /api/v1/analyze`、`/statistics`、`/predictions`、`/risk-assessment`、`/etl/process`                                                                             |
| 质量与统一模型 | `POST /api/v1/quality/assess`、`GET /api/v1/quality/thresholds`、`GET /api/v1/quality/history`、`POST /api/v1/unified-model/transform`、`/api/v1/unified-model/merge` |
| 透视分析       | `POST /api/v1/pivot/create`、`/query`、`/trend-analysis`、`/risk-score`、`/summary`                                                                                   |

所有 `/api/v1` 业务接口都返回版本化响应信封。成功响应包含 `schemaVersion`、`requestId`、`generatedAt`、`modelVersion`、`inputSnapshotId`、`warnings`、`processingTime` 和兼容字段 `timestamp`；校验失败和内部失败分别使用稳定的 `ANALYTICS_VALIDATION_ERROR`、`ANALYTICS_INTERNAL_ERROR` 错误信封。共享样本位于 `packages/contracts/analytics-response-envelope.json` 和 `packages/contracts/analytics-error-envelope.json`。

### 数据源

| 数据源        | 范围               | 用途                                   |
| ------------- | ------------------ | -------------------------------------- |
| DisasterAware | 活跃灾害与类型接口 | 配置凭据后的已鉴权主数据源             |
| USGS          | 地震 GeoJSON       | 降级和聚合数据源                       |
| NASA EONET    | 环境事件           | 野火、火山、洪水、风暴、干旱和滑坡数据 |
| GDACS         | 全球警报           | 灾害警报和协调数据                     |

### 运行说明

- FastAPI 离线时，地图和公开灾害流程仍可运行；分析面板会显示自己的离线或错误状态。
- Mapbox 渲染需要有效的 `VITE_MAPBOX_TOKEN`。
- `dist/` 与 `dist-server/` 是本地构建生成物。
- 新功能默认在隔离 Git worktree 中开发。行为改动遵循 TDD：先写失败测试，再用最小实现转绿，最后在测试保护下重构。
- 当前项目状态是本地开发与质量治理，不是部署。

### 安全说明

- `.env` 已被 Git 忽略，不能提交。
- 不要把服务端秘密放在 `VITE_` 下；这些值会成为浏览器可见的构建输入。
- BFF 对 DisasterAware 路由与请求头实施白名单，限制请求体、校验 query、执行进程内限流，并返回脱敏的上游错误。
- 管理 token、DisasterAware 凭据和模型服务 Key 只存在于服务端环境，不能出现在日志、前端包或导出报告中。

### 项目结构

```text
prometheus-global-guardian/
├── apps/web/
│   ├── index.html              # 浏览器 HTML 入口
│   └── src/
│       ├── features/           # 地图与分析功能
│       ├── state/              # 鉴权和 UI 状态 Provider
│       ├── services/           # 前端 HTTP、灾害、AI、鉴权和分析边界
│       ├── components/         # 共享 React 组件和弹窗
│       ├── workers/            # 灾害处理 Web Worker
│       └── App.tsx             # 鉴权与 Provider/视图组合
├── apps/bff/
│   ├── index.ts                 # Express 应用入口
│   ├── ai/                      # Provider 选择、路由和流适配
│   ├── hazards/                 # 公开数据聚合
│   └── security/                # BFF 请求边界
├── services/analytics/
│   ├── app/                     # FastAPI 工厂、路由、Schema 和服务
│   ├── analytics/               # 统计、预测、风险、质量、ETL 和透视逻辑
│   └── tests/                   # Python unittest 套件
├── packages/
│   ├── contracts/               # TypeScript 与 Python 共用的语言无关 JSON 契约
│   ├── hazard-domain/           # 不依赖具体运行时的 TypeScript 灾害模型与注册表
│   └── logging/                 # Web 与 BFF 共用的日志 API
├── apps/web/tests/              # Web Service、组件和 E2E 测试
├── apps/bff/tests/              # BFF Node 与 Service 测试
├── tests/integration/           # 跨运行单元集成测试
├── infra/persistence/tests/     # 持久化运维测试
├── docs/                        # 治理、测试基线、计划和规格
├── tooling/                     # Node 版本、架构和 Docker 配置工具
├── package.json                  # 仓库脚本与工作区依赖编排
├── vite.config.ts                # Web root 与根目录 dist/ 输出
├── vitest.config.ts              # Service 测试配置
├── playwright.config.ts          # 浏览器测试配置
├── Dockerfile                    # 本地完整栈镜像
├── services/analytics/Dockerfile # Analytics 服务镜像
├── docker-compose.yml           # 本地完整栈启动
├── docker-compose.test.yml      # 隔离测试数据库覆盖
├── .dockerignore                # 构建上下文排除项
└── AGENTS.md                    # 开发、worktree、TDD 和验证约定
```

Web 运行单元位于 `apps/web/`，实现位于 `apps/web/src/`；BFF 运行单元位于 `apps/bff/`，入口为 `apps/bff/index.ts`；Analytics 运行单元位于 `services/analytics/`，入口为 `main.py`。Vite 从 `apps/web/index.html` 构建，客户端产物仍输出到仓库根目录 `dist/` 并由 Express 提供。根目录继续保留 package 脚本、Vite、Vitest、Playwright 和 Dockerfile 编排入口。Web 与 BFF 生产代码通过公共入口 `@pgg/hazard-domain` 使用灾害领域包；旧共享灾害兼容层已移除。
