# SSE 断连自动恢复与会话续传实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（本次实现按主代理分阶段执行，并在每个阶段复核）。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 AI SSE 在浏览器短暂断连后可以继续生成、自动重连、重放缺失事件，并在恢复窗口结束后提供安全的手动重试兜底。

**Architecture:** Express BFF 使用有界进程内会话注册表缓存已经转换的 SSE 事件，浏览器以随机 `X-AI-Request-Id` 和 `Last-Event-ID` 续传。`streamChatMessage` 负责请求 ID、有限指数退避和事件序号去重，`useAIChatSession` 管理本地请求隔离和恢复状态，provider 明确错误不自动重试。

**Tech Stack:** React 19、TypeScript 5.9、Fetch/ReadableStream/AbortController、Express 5、Node Transform、Vitest、Node test。

## Global Constraints

- 先运行 `git status --short`，保留工作区已有的调研文档和优化清单改动；不暂存、不提交、不推送。
- 不引入数据库、Redis、Socket.IO、状态库或新的生产依赖。
- 服务端默认恢复窗口 30 秒、最多 256 个事件、512 KiB、100 个会话；环境变量可覆盖但必须限制上限。
- 客户端最多自动恢复 3 次，退避为 200ms、400ms、800ms；显式 provider 错误、HTTP 错误、会话过期和请求指纹冲突不重试。
- 请求 ID 和请求体指纹不得泄露给 provider、日志或浏览器错误正文。
- 主动停止、关闭、清空和卸载会立即失效请求并 abort，不自动恢复。
- 每个行为先写失败测试，确认 RED 后再写最小实现；完成前运行相关测试、类型检查、格式检查和差异检查。

---

### Task 1: 新增有界 SSE 会话注册表

**Files:**

- Create: `server/ai/ai-stream-session.ts`
- Create: `tests/service-ai-stream-session.test.ts`

**Interfaces:**

```ts
export type AIStreamSessionStatus = "active" | "completed" | "failed";

export interface AIStreamSessionRegistryOptions {
  ttlMs?: number;
  maxEvents?: number;
  maxBytes?: number;
  maxSessions?: number;
}

export interface AIStreamSession {
  readonly requestId: string;
  readonly fingerprint: string;
  readonly status: AIStreamSessionStatus;
  readonly nextEventId: number;
  attach(lastEventId: number, subscriber: AISessionSubscriber): AISessionAttachResult;
  publish(payload: string): void;
  complete(): void;
  fail(payload: string): void;
  dispose(): void;
}
```

- [x] 写失败测试：事件 ID 单调递增、重连只得到指定序号之后的事件、完成会话回放后立即结束、指纹不一致拒绝、缓存淘汰与超前游标拒绝、活动订阅 TTL 保持、终态保留窗口、dispose 调用 abort。
- [x] 运行 `pnpm exec vitest run tests/service-ai-stream-session.test.ts`，确认因为模块不存在或接口未实现而 RED。
- [x] 实现请求 ID 校验、事件缓冲、订阅者 attach/detach、无订阅者/终态后的 TTL 定时器、会话数上限和安全 attach 结果。
- [x] 运行同一测试确认 GREEN，再用 Prettier 格式化实现和测试。

### Task 2: BFF 接入会话和恢复协议

**Files:**

- Modify: `server/ai/ai-chat-route.ts`
- Modify: `server.ts`
- Modify: `tests/server-ai-stream.test.ts`

**Interfaces:**

```ts
export interface AIChatRouteOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: UpstreamFetch;
}

export function registerAIChatRoute(
  app: Application,
  middlewares?: RequestHandler[],
  options?: AIChatRouteOptions,
): void;
```

- [x] 写失败测试：首次请求只调用一次 provider；响应断开后相同 request ID + `Last-Event-ID` 可以重放缺失事件；已完成会话可以回放 `[DONE]`；过期、指纹冲突、缓存缺口和超前游标返回稳定错误；完整/不完整/flush SSE 帧超限会失败并停止上游；会话淘汰会中止 pending Provider 请求并清理迟到响应。
- [x] 运行 `pnpm run test:bff`，确认新续传测试 RED。
- [x] 在 `server/ai/ai-chat-route.ts` 创建/查找会话，解析和校验 `X-AI-Request-Id`、`Last-Event-ID`，将 `serverEnv` 传入恢复注册表。
- [x] 将 provider 转换流拆成 SSE 事件后发布到会话；浏览器响应只作为订阅者，断开时 detach 而不是立即 abort；恢复窗口结束或会话淘汰时由 registry abort 上游；Provider 转换层和事件泵限制单帧为 64 KiB。
- [x] 对正常完成发布 `[DONE]` 并结束会话；对上游 error/提前 close 发布安全 `event: error` 并结束会话；保留响应开始前的现有 provider fallback。
- [x] 运行 `pnpm run test:bff` 和服务端 TypeScript 类型检查确认 GREEN。

### Task 3: 客户端 Service 自动重连和事件去重

**Files:**

- Modify: `src/services/ai/aiAssistantService.ts`
- Modify: `tests/service-ai.test.ts`

**Interfaces:**

```ts
export interface StreamChatOptions {
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
  requestId?: string;
  onReconnect?: (attempt: number, delayMs: number) => void;
}
```

- [x] 写失败测试：首次流只返回一段后网络异常，第二次请求携带相同 request ID 和 `Last-Event-ID`；重放旧事件不会重复 onChunk；自动恢复成功返回 completed；超过三次返回 failed；显式 error 和 410 不重试；abort 中断退避定时器。
- [x] 运行 `pnpm exec vitest run tests/service-ai.test.ts` 确认 RED。
- [x] 实现 SSE `id:` 解析、最后事件序号、请求头、可取消退避和最大三次恢复；只对 transport/EOF 类失败重试。
- [x] 若断连发生在首个事件之前，从 `Last-Event-ID: 0` 恢复；Service 负责生成随机请求 ID，Hook 的本地序号只用于旧回调隔离。
- [x] 为 Service 维护安全错误文案，不暴露 session、provider 或响应正文；保持现有 Demo、取消、UTF-8 和 reader 清理语义。
- [x] 运行 Service 测试确认 GREEN。

### Task 4: Hook 和组件恢复状态

**Files:**

- Modify: `src/hooks/useAIChatSession.ts`
- Modify: `src/components/AIChatAssistant.tsx`
- Modify: `tests/component/ai-chat-assistant.test.tsx`

- [x] 写失败测试：恢复期间仍显示生成态和中文恢复提示，恢复成功清除提示，最终失败显示重试；stop、close、clear、unmount 后不再自动重连；重试不追加重复 user 消息。
- [x] 运行组件测试确认 RED。
- [x] 为每次发送生成 request ID，将恢复回调映射为 `reconnectingText`；自动恢复期间保持 `isStreaming`，最终状态沿用已有 completed/cancelled/failed 处理。
- [x] 更新组件显示恢复提示，并保证主动取消不进入恢复流程。
- [x] 手动整请求重试前移除失败的半截助手消息，避免新旧回复叠加。
- [x] 运行组件和 Service 测试确认 GREEN。

### Task 5: 清单同步与完整验证

**Files:**

- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `docs/TESTING_BASELINE.md`（仅当测试数量或命令说明发生变化）

- [x] 将 SSE 自动恢复与会话续传从 P1 剩余项移入已完成能力，记录有界内存会话、事件重放、自动重连、去重和最终手动重试边界。
- [x] 运行 `pnpm run test:baseline`、`pnpm run test:python` 和 `git diff --check`；最终结果：BFF 84/84、Service 191/191、组件 81/81、E2E 1/1、Python 44/44，通过 lint、格式检查、类型检查和构建。
- [x] 检查 `git status --short` 与 `git diff --stat`，确认只包含 SSE 实现、测试、规格/计划、配置和文档；不暂存、不提交。
