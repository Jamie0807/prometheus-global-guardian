# 用户账号与 AI 持久化实施计划

## 执行进度（2026-09-21）

实施分支：`codex/user-auth-ai-persistence`（隔离 worktree），已合并到 `main`。

- 已完成实现：PostgreSQL/Prisma 数据模型与显式迁移；注册、登录、退出、会话恢复、账号删除和全站登录门禁；同源 Analytics BFF 与 FastAPI 服务令牌；按账号隔离的 AI 对话/消息；上下文裁剪、摘要与用户确认的长期记忆；本地/Compose 配置和项目文档。
- 已完成实现补充：没有模型配置时保留本地演示回复，并将其写入当前账号的持久化对话；Vite 开发代理保留浏览器原始 Host，满足同源校验。
- 已完成审查修正：SSE 续传指纹绑定用户；助手最终回复先写入数据库再发送完成标记；显式停止请求由 BFF 中止上游生成并在会话完成竞态中持久化为 `CANCELLED`；启动时将上次进程遗留的 `STREAMING` 助手消息恢复为 `FAILED`；`PUBLIC_ORIGIN` 支持 TLS 终止代理的来源校验与 Secure Cookie；后台 AI 文本任务可在 router 模式回退到已配置 Workflow。
- 分支验收通过：BFF 95/95、Service 245/245、组件 108/108、Playwright 1/1；Python 3.13 容器内 57/57。`test:baseline` 的 lint、格式、客户端/服务端/契约类型检查、生产构建均通过。
- 隔离 Compose PostgreSQL 已应用 2 条迁移，重复部署结果为无待应用迁移；注册/登录/恢复/退出、重复消息冲突与完成响应重放、生成前取消及重试复用均由数据库集成测试覆盖。CI 已配置 PostgreSQL service 与迁移步骤。
- lint 有 7 条仅来自生成 Prisma 文件的 unused-disable 警告；构建保留 Mapbox 大 chunk 提示。主机 Python 为 3.9，因此 Python 测试在匹配项目依赖的临时 3.13 容器中运行。代码已合并到 `main`，尚未部署。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Prometheus Global Guardian 增加多账号注册登录、全站 BFF 会话授权、持久化 AI 对话与用户确认式长期记忆。

**Architecture:** Express BFF 使用 PostgreSQL 和 Prisma 管理用户、Cookie 会话、对话、消息与记忆；浏览器只访问同源 BFF。FastAPI 保留独立计算服务，通过服务间令牌和 BFF allowlist 代理接受分析请求。前端认证态只在会话检查通过后挂载受保护应用。

**Tech Stack:** React 19、Vite 7、Express 5、TypeScript 5、PostgreSQL、Prisma 7（参考 AI Workflow 的 Prisma + PostgreSQL adapter 模式）、Argon2id、FastAPI。

## Global Constraints

- 运行时使用 Node `>=20.19 <21`、pnpm `10.15.1`、Python `3.13`。
- 浏览器只使用同源 `/api/*`；会话凭据为 HttpOnly Cookie，不在 localStorage 保存认证令牌。
- 所有用户资源以 BFF 会话中的 `userId` 作授权依据，不信任请求正文、路径外的用户 ID。
- AI 对话由 BFF 从数据库读取；SSE 续传继续使用现有有界短期内存窗口。
- 邮箱 + 密码自助注册只针对私有/本地部署；本轮不实现邮箱验证、密码找回、OAuth 或公网运维。
- 长期记忆由用户主动请求生成建议并逐条确认；删源对话保留已确认记忆，删账号清除全部关联数据。
- FastAPI 不验证终端用户身份；分析业务路由只接受 BFF 服务间令牌，管理接口继续使用独立管理令牌。
- 不迁移整个仓库到 Turborepo workspace，不修改灾害历史/PostGIS 设计，不引入向量数据库。
- 新增环境变量必须同步更新 `.env.example`、Compose 与项目文档；不得记录凭据、会话 Cookie、对话或记忆正文。
- 不运行数据库生产迁移；迁移文件须可审阅，部署迁移只在显式运行部署步骤时执行。

---

## 目录与文件职责

| 路径                                                                                 | 职责                                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `prisma/schema.prisma`、`prisma/migrations/`、`prisma.config.ts`                     | PostgreSQL 模型、索引、级联关系及版本化迁移。                |
| `server/db/prisma.ts`                                                                | 单例 Prisma Client 与 PostgreSQL adapter 初始化。            |
| `server/auth/passwords.ts`                                                           | Argon2id 密码哈希和验证。                                    |
| `server/auth/session-service.ts`                                                     | 会话创建、哈希令牌查找、CSRF token 派生、过期与撤销。        |
| `server/auth/auth-routes.ts`                                                         | 注册、登录、退出、当前用户和账号删除 HTTP 边界。             |
| `server/auth/require-user.ts`                                                        | 从 Cookie 解析会话并在 Express 请求上提供已验证的 `userId`。 |
| `server/analytics/analytics-route.ts`                                                | Analytics BFF allowlist、服务间认证、超时和边界错误。        |
| `server/ai/conversation-repository.ts`、`server/ai/conversation-routes.ts`           | 用户隔离的对话/消息持久化及会话列表、读取、删除接口。        |
| `server/ai/context-manager.ts`                                                       | 从已完成历史、摘要和长期记忆组装预算内模型上下文。           |
| `server/ai/memory-routes.ts`、`server/ai/memory-generation.ts`                       | 生成待确认建议和管理有效记忆。                               |
| `src/state/AuthContext.tsx`                                                          | 登录状态、CSRF token、会话刷新和退出动作。                   |
| `src/components/AuthScreen.tsx`                                                      | 登录/注册界面及账号错误提示。                                |
| `src/services/auth/userAuthService.ts`                                               | 同源用户认证 API 客户端。                                    |
| `src/services/analytics/analyticsService.ts`                                         | Analytics 请求切换为同源 `/api/analytics`。                  |
| `src/hooks/useAIChatSession.ts`、`src/components/AIChatAssistant.tsx`                | 加载/切换持久化对话，提交单条新消息并恢复当前对话。          |
| `src/components/AIConversationList.tsx`、`src/components/AIMemoryManager.tsx`        | 对话列表和长期记忆建议/管理界面。                            |
| `server.ts`、`src/App.tsx`、`src/components/Header.tsx`                              | 组装服务路由、全站认证门禁及账号入口。                       |
| `python-analytics-service/security.py`、`python-analytics-service/app/routes/`       | FastAPI 分析路由验证 BFF 服务令牌。                          |
| `package.json`、`pnpm-lock.yaml`、`Dockerfile`、`docker-compose.yml`、`.env.example` | 依赖、生成/迁移命令和本地 PostgreSQL/服务网络配置。          |
| `README.md`、`docs/PROJECT_SPEC.md`、`docs/PROJECT_OPTIMIZATION_BACKLOG.md`          | 更新运行方式、数据边界和待办状态。                           |

## Task 1: PostgreSQL、Prisma 与数据模型

**Files:**

- Create: `prisma/schema.prisma`
- Create: `prisma.config.ts`
- Create: `server/db/prisma.ts`
- Create: `prisma/migrations/<timestamp>_account_ai_persistence/migration.sql`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `package.json` (Prisma generation/build scripts and format coverage)
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `Dockerfile`
- Modify: `.github/workflows/quality.yml`

**Interfaces:**

- Produces `export const prisma: PrismaClient` from `server/db/prisma.ts`.
- Models: `User`, `AuthSession`, `AIConversation`, `AIMessage`, `AIMemoryItem`, `AIMemorySuggestion`.
- `User` has normalized unique email, password hash, `memoryEnabled` defaulting to `true`, and timestamps.
- `AuthSession` stores only unique `tokenHash`, `userId`, `createdAt`, `lastSeenAt`, and `expiresAt`.
- `AIMessage` has conversation ID, client message ID, role, content, status and timestamp; `(conversationId, clientMessageId)` is unique for idempotent SSE retries.
- Conversation/message/suggestion relations cascade with user deletion; accepted memory uses nullable source conversation with `SetNull` deletion behavior.

- [x] Add Prisma 7, `@prisma/client`, `@prisma/adapter-pg`, `pg`, Prisma CLI, `@types/pg`, and `argon2` dependencies. Generate Prisma Client to `server/generated/prisma` so server TypeScript owns generated imports.
- [x] Define the six models, database enums, uniqueness constraints, foreign keys and indexes needed for session lookup, chronological messages, conversation listing, memory status and source ownership.
- [x] Add `prisma.config.ts` that reads `DATABASE_URL`; add `db:generate` and `db:migrate:deploy` scripts. Make server build and typecheck generate the client first. Generate `prisma/migrations/20260921000000_account_ai_persistence/migration.sql` from the schema and inspect every destructive statement before accepting it.
- [x] Initialize one `PrismaPg` adapter and one Prisma Client in `server/db/prisma.ts`; do not create a new pool per request.
- [x] Add a PostgreSQL Compose service with a named volume and health check; make `web` wait for PostgreSQL health. Keep database port private by default.
- [x] Pass `DATABASE_URL` to the BFF runtime and copy the Prisma schema/migrations into the runtime image so explicit deployment migration commands work.
- [x] Add a safe placeholder `DATABASE_URL` to `.env.example`; document local startup and explicit `pnpm run db:migrate:deploy` use without running it against a production database.
- [x] Run `pnpm run typecheck:server`, `pnpm run build:server`, `pnpm run lint`, `pnpm run format:check` and `git diff --check`.

## Task 2: Account endpoints and server-side sessions

**Files:**

- Create: `server/auth/passwords.ts`
- Create: `server/auth/session-service.ts`
- Create: `server/auth/auth-routes.ts`
- Create: `server/auth/require-user.ts`
- Modify: `server/express.d.ts`
- Modify: `server.ts`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `package.json` (`format:check` coverage for auth/server files)

**Interfaces:**

- `requireUser: RequestHandler` assigns `req.user = { userId: string }` only after a valid database session lookup.
- `POST /api/auth/register` accepts `{ email, password }` and returns the minimal user plus session CSRF token; duplicate normalized email returns `409`.
- `POST /api/auth/login` accepts `{ email, password }`; invalid credentials return a generic `401`.
- `POST /api/auth/logout` revokes the current session and expires its Cookie.
- `GET /api/auth/session` returns `{ authenticated: false }` or `{ authenticated: true, user, csrfToken }`.
- `DELETE /api/auth/account` accepts `{ password }`, verifies it, then transactionally deletes all account-owned data and revokes the Cookie.

- [x] Implement password hashing with Argon2id and verification without ever logging the supplied password or stored hash.
- [x] Create 256-bit random session tokens; store SHA-256 hashes only, compare hashes safely, rotate on login, and enforce 30-minute idle and 7-day absolute expiry.
- [x] Set `pg_session` as an HttpOnly, SameSite=Lax, Path=/ Cookie; add Secure in production HTTPS. Derive the session-bound CSRF token with an HMAC secret and return it only from authenticated register/login/session responses.
- [x] Validate same-origin `Origin`/`Host` and `X-CSRF-Token` for authenticated mutations. Apply body limits and dedicated process-local rate limits to register and login.
- [x] Implement the five auth endpoints with normalized email, password length 12–128 characters, generic login failure, stable error envelopes, and no role field.
- [x] Add `req.user` to the Express request type. Mount auth routes before a `/api` session gate; keep static assets and health checks outside that gate.
- [x] Place `registerAIChatRoute` and every existing business API behind `requireUser`; keep `/api/auth/register`, `/api/auth/login`, `/api/auth/session`, and `/api/auth/logout` explicitly routed before the gate.
- [x] Remove the startup call to upstream `authorize()` as the app's identity signal; keep `/api/authorize` as a separately protected DisasterAware connectivity check.
- [x] Add `AUTH_CSRF_SECRET`, `AUTH_SESSION_IDLE_TTL_MS`, `AUTH_SESSION_ABSOLUTE_TTL_MS`, `BFF_REGISTER_RATE_LIMIT_MAX`, and `BFF_LOGIN_RATE_LIMIT_MAX` examples and Compose mappings. Refuse insecure startup when required secrets are missing in production.
- [x] Run `pnpm run typecheck:server`, `pnpm run build:server`, `pnpm run lint`, `pnpm run format:check` and `git diff --check`.

## Task 3: Frontend login gate and account controls

**Files:**

- Create: `src/state/AuthContext.tsx`
- Create: `src/components/AuthScreen.tsx`
- Create: `src/services/auth/userAuthService.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/SettingsModal.tsx`
- Modify: `src/services/auth/authService.ts`
- Modify: `src/services/http/httpClient.ts`
- Modify: `src/index.css`
- Modify: `package.json` (`format:check` coverage for root app components and state)

**Interfaces:**

- `AuthContext` exposes `status: "loading" | "authenticated" | "unauthenticated"`, minimal `user`, `csrfToken`, `login`, `register`, `logout`, and `refreshSession`.
- `userAuthService` sends same-origin requests with `credentials: "same-origin"` and adds `X-CSRF-Token` to authenticated mutations.
- A `401` from any business request invalidates client auth state and returns the app to `AuthScreen`; it does not refresh DisasterAware credentials.

- [x] Implement auth API parsing from `unknown` and stable client errors; never retain a session token in React local storage or browser storage.
- [x] Add email/password sign-in and registration states to `AuthScreen`, including pending, invalid credentials, duplicate email and network failure messages.
- [x] Place `AuthProvider` above UI/map providers. Render a loading shell until `/api/auth/session` resolves, render the sign-in screen when logged out, and mount the existing application providers only when authenticated.
- [x] Remove `useAuthorization()` from application initialization. Keep `authService.authorize()` exclusively for the upstream connectivity check used by hazard services after user sign-in.
- [x] Add the authenticated email and logout action to `Header`; clear in-memory AI state on logout and cancel active streams before leaving the protected app.
- [x] Add an account section to `SettingsModal` with a current-password confirmation for `DELETE /api/auth/account`; on success revoke client auth state and return to `AuthScreen`.
- [x] Add dark-blue/cyan login styling consistent with the home shell, responsive fields, visible focus indicators and form labels.
- [x] Run `pnpm run typecheck:client`, `pnpm run build:client`, `pnpm run lint`, `pnpm run format:check` and `git diff --check`.

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

- [x] Implement an allowlist proxy with method/path matching, 64 KiB request body limit, existing query constraints, upstream timeout and stable sanitized error envelopes.
- [x] Add a shared Python dependency for the BFF service token, return 404 when unset/invalid, and apply it to all business endpoints without changing `/health`, `/metrics` and `/cache/clear` semantics.
- [x] Replace Analytics `API_BASE_URL` references with `/api/analytics` routes, including service health/info checks and every `/api/v1/*` call.
- [x] Add `ANALYTICS_SERVICE_URL` and `ANALYTICS_SERVICE_TOKEN` to `.env.example` and Compose; remove `VITE_PYTHON_API_URL` from client build arguments and stop publishing the Analytics container port to the host.
- [x] Update Vite proxy to keep all `/api/*` calls same-origin through Express and retain local Python service access only from BFF.
- [x] Run `pnpm run typecheck:server`, `pnpm run typecheck:client`, `pnpm run typecheck:contracts`, `pnpm run build`, `python3 -m compileall -q python-analytics-service/security.py python-analytics-service/app/routes/analytics.py python-analytics-service/app/routes/quality.py python-analytics-service/app/routes/pivot.py`, `pnpm run lint`, `pnpm run format:check` and `git diff --check`.

## Task 5: Persist conversations and replace browser-owned history

**Files:**

- Create: `server/ai/conversation-repository.ts`
- Create: `server/ai/conversation-routes.ts`
- Create: `src/components/AIConversationList.tsx`
- Modify: `server/ai/ai-chat-route.ts`
- Modify: `server/ai/ai-provider.ts`
- Modify: `src/services/ai/aiAssistantService.ts`
- Modify: `src/hooks/useAIChatSession.ts`
- Modify: `src/components/AIChatAssistant.tsx`
- Modify: `server.ts`
- Modify: `package.json` (`format:check` coverage for conversation modules)

**Interfaces:**

- `POST /api/ai/conversations` accepts optional `{ title }`; `GET /api/ai/conversations` lists only the signed-in user's conversations.
- `GET /api/ai/conversations/:conversationId` returns that user's title, summary and chronologically ordered messages; `DELETE` deletes only an owned conversation.
- `POST /api/ai/conversations/:conversationId/messages` accepts `{ clientMessageId, content, disasterContext }` and returns the existing SSE protocol. The BFF loads all prior context from storage.
- `conversationRepository` exports `create`, `listForUser`, `getForUser`, `appendUserMessageOnce`, `appendAssistantResult`, and `deleteForUser` operations.

- [x] Complete assistant-generation idempotency for repeated `clientMessageId` values across distinct request IDs; cancelled/failed rows are reused for retry, completed responses are replayed, and concurrent generation returns a stable conflict.
- [x] Add list/create/detail/delete routes. Return `404` when a conversation is missing or belongs to another user.
- [x] Change AI stream request validation to accept one new user message and an owned conversation ID, not a client-supplied history. Preserve request ID, fingerprint, Last-Event-ID and SSE frame behavior.
- [x] Before provider selection, load the owned conversation's completed messages and summary, validate disaster context, and append the new user message once. Persist assistant partial/final status while preserving cancel/retry behavior.
- [x] Update `useAIChatSession` to hold the selected conversation and its server-loaded messages, and to create/list/select/delete conversations through the service client.
- [x] Add a conversation list to `AIChatAssistant`; restore the most recently updated conversation after reload and start a new empty conversation on explicit user action.
- [x] Run `pnpm run typecheck:server`, `pnpm run typecheck:client`, `pnpm run build:server`, `pnpm run build:client`, `pnpm run lint`, `pnpm run format:check` and `git diff --check`.

## Task 6: Context summaries and user-controlled long-term memory

**Files:**

- Create: `server/ai/context-manager.ts`
- Create: `server/ai/memory-generation.ts`
- Create: `server/ai/memory-routes.ts`
- Create: `src/components/AIMemoryManager.tsx`
- Modify: `server/ai/ai-chat-route.ts`
- Modify: `server/ai/ai-provider.ts`
- Modify: `server.ts`
- Modify: `src/services/ai/aiAssistantService.ts`
- Modify: `src/components/AIChatAssistant.tsx`
- Modify: `src/components/SettingsModal.tsx`
- Modify: `src/index.css`
- Modify: `package.json` (`format:check` coverage for memory modules)

**Interfaces:**

- `POST /api/ai/memory-suggestions` accepts `{ conversationId }` and returns persisted pending suggestions for that owned conversation.
- `GET /api/ai/memory-suggestions`, `POST /api/ai/memory-suggestions/:id/accept`, and `DELETE /api/ai/memory-suggestions/:id` list, confirm and dismiss only the current user's suggestions.
- `GET /api/ai/memories`, `PATCH /api/ai/memories/:id`, `DELETE /api/ai/memories/:id`, and `DELETE /api/ai/memories` manage the user's effective memory items; `PATCH /api/auth/account` memory setting toggles injection.
- `buildConversationContext(userId, conversationId, newMessage)` returns a bounded ordered model history from current summary, recent messages, selected enabled memories and the new user message.

- [x] Implement context selection with a 48 KiB serialized budget: keep the newest completed turns, reserve space for the current input and enabled memory, and update a concise AI-generated summary when older turns are trimmed from model context. Never delete source messages during summarization.
- [x] Add a non-streaming provider task path that uses the existing provider configuration and returns only validated structured suggestion/summary text; impose current provider timeout and a bounded input/output size.
- [x] Generate memory proposals only after the user explicitly requests them. Persist proposals as `PENDING`; accept each only after owner verification and optional user editing; dismiss without injecting it.
- [x] Select at most 20 enabled memory items by PostgreSQL full-text/keyword relevance within the same context budget. Skip all memory retrieval when `memoryEnabled` is false.
- [x] Add memory settings to account preferences and `AIMemoryManager` for viewing, editing, disabling, deleting, clearing all, and reviewing suggestions.
- [x] Enforce approved deletion semantics: conversation deletion cascades pending suggestions and sets accepted memories' source conversation to null; user deletion cascades all account records.
- [x] Run `pnpm run typecheck:server`, `pnpm run typecheck:client`, `pnpm run build:server`, `pnpm run build:client`, `pnpm run lint`, `pnpm run format:check` and `git diff --check`.

## Task 7: Documentation and complete local integration

**Files:**

- Modify: `README.md`
- Modify: `docs/PROJECT_SPEC.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `package.json`

- [x] Document local PostgreSQL startup, initial migration command, self-hosted registration boundary, account deletion, backup/restore, private FastAPI network and service token rotation.
- [x] Update project architecture diagrams: browser calls BFF for Analytics; BFF owns user sessions and AI persistence; FastAPI remains the internal analytics compute service.
- [x] Update the backlog P1 item only after the implemented and documented scope is complete; keep public email verification/reset as a separate follow-up if it remains unimplemented.
- [x] Reconcile `.env.example`, Compose and Docker build/runtime configuration so no stale `VITE_PYTHON_API_URL` browser configuration remains.
- [x] Run `pnpm run lint`, `pnpm run format:check`, `pnpm run typecheck:client`, `pnpm run typecheck:server`, `pnpm run typecheck:contracts`, `pnpm run build`, `python3 -m compileall -q python-analytics-service/security.py python-analytics-service/app/routes/analytics.py python-analytics-service/app/routes/quality.py python-analytics-service/app/routes/pivot.py`, and `git diff --check`.
- [x] Review the final diff for auth bypasses, cross-user resource queries, secret/log exposure, unsafe deletion behavior, and accidental changes to the existing dirty backlog edit.

## Task 8: Migrate the AI Service regression suite

**Scope:** migrate only `tests/service-ai.test.ts` to the current persisted conversation API; do not edit production files or other test files.

- Current contract: `streamChatMessage(message: PersistedChatInput, context, options)` receives `{ conversationId, clientMessageId, content }`, posts to `/api/ai/conversations/:conversationId/messages`, and sends `{ clientMessageId, content, disasterContext }`. Demo fallback persists through `/api/ai/conversations/:conversationId/demo-reply` with `{ userClientMessageId, content }`.
- [x] Preserve the current coverage for canonical disaster context, SSE parsing, reconnect, abort, safe errors and Demo fallback.
- [x] Build `PersistedChatInput` fixtures with `conversationId`, `clientMessageId` and `content`; assert the owned conversation messages endpoint and request body.
- [x] Mock and assert the authenticated Demo reply persistence request for the same conversation and user message.
- [x] Run `pnpm exec vitest run tests/service-ai.test.ts`; the migrated AI Service suite passes.

## Task 9: Idempotency, test migration and CI integration validation

**Files:**

- Modify: `server/ai/ai-chat-route.ts`, `server/ai/conversation-repository.ts`, `prisma/schema.prisma`, `prisma/migrations/`
- Modify: `tests/server-ai-persistence.test.ts`, `tests/server-ai-stream.test.ts`, `tests/server-auth.test.ts`, `tests/component/`, `tests/e2e/app-smoke.spec.ts`, `python-analytics-service/tests/test_api_routes.py`
- Modify: `.github/workflows/quality.yml`, `docker-compose.test.yml`, `docs/TESTING_BASELINE.md`, `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

- [x] Persist one assistant reply per client message; reuse failed/cancelled rows for retry and return a stable conflict while a generation is active.
- [x] Add PostgreSQL integration cases for register/login/session restore/logout, duplicate concurrent generation, completed response replay, and cancellation before provider headers followed by retry.
- [x] Migrate BFF, AI stream, React component, E2E, and FastAPI route tests to authenticated request/session contracts. Keep a Python API regression verifying missing or invalid service tokens are rejected.
- [x] Add an isolated Compose test database and configure GitHub Actions to start PostgreSQL, apply migrations, then run the BFF/frontend baseline.
- [x] Verify the isolated database migration twice, `pnpm run test:baseline`, Python 3.13 unittest discovery, and `git diff --check`; record actual results above and in `docs/TESTING_BASELINE.md`.

## Spec Coverage

| Spec area                                                       | Plan task |
| --------------------------------------------------------------- | --------- |
| PostgreSQL models, migrations and deployment boundary           | Task 1    |
| Password auth, cookie sessions, CSRF and account deletion       | Task 2    |
| Full-site authentication UI and auth state                      | Task 3    |
| Analytics same-origin proxy and FastAPI service credential      | Task 4    |
| Per-user persisted conversations, message status and SSE resume | Task 5    |
| Context summaries, explicit memory suggestions and controls     | Task 6    |
| Operations, documentation, validation and backlog closeout      | Task 7    |
| Service regression migration                                    | Task 8    |
| Idempotency, test migration and CI database verification        | Task 9    |

## Self-Review

- Spec coverage maps every accepted requirement to a task; public deployment, email verification/recovery, OAuth, roles, GIS history and vector search remain excluded as approved.
- Every API path referenced by the plan is defined in a task interface. Every user-owned repository operation receives the verified `userId`.
- The existing DisasterAware `authorize()` service remains separate from user registration and session authentication.
- The existing BFF and Python service retain their runtime boundaries; no workspace conversion or unrelated architecture migration is introduced.
