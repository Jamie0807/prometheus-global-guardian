# BFF 代理边界治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 为 Express BFF 建立受限的 DisasterAware 代理、请求大小与查询校验、限流、超时和脱敏错误契约。

**架构：** `server/security/request-boundaries.ts` 负责可单测的请求限制、错误响应、限流配置、代理路径匹配和上游超时；`server.ts` 只组合中间件和路由。保留现有浏览器服务调用路径，不引入浏览器鉴权或 Python 服务变更。

**技术栈：** Node.js 20、Express 5、TypeScript 5、node-fetch、node:test。

## 全局约束

- 只修改 BFF、BFF 测试、配置样例、README 和优化清单。
- 不自动执行 `git add`、`git commit`、push 或修改 Git 历史。
- 不输出、记录或提交任何真实凭据、token、cookie 或 API key。
- 所有新增行为遵循 TDD：先写会失败的测试，再补最小实现。
- 错误响应不得返回上游 URL、响应体、服务端凭据或内部异常文本。
- 当前项目没有用户身份协议；本次仅提供 IP 维度的单进程基础限流，并在文档中说明多实例限制。

---

## 文件结构

- 新增 `server/security/request-boundaries.ts`：请求体、query、路径和方法边界；受限请求头；超时 fetch；内存限流器。
- 修改 `server.ts`：使用安全模块替换原始通用 `/api` 代理，并为认证和 AI 注册限流。
- 修改 `tests/server-auth.test.ts`：增加所有 BFF 边界和兼容行为回归测试。
- 修改 `.env.example`、`README.md`：说明可配置限流和上游超时值，以及单实例限制。
- 修改 `docs/PROJECT_OPTIMIZATION_BACKLOG.md`：记录实现状态、覆盖范围和剩余 Python 管理面治理。

### Task 1: 定义并测试边界工具

**Files:**

- Create: `server/security/request-boundaries.ts`
- Modify: `tests/server-auth.test.ts`

**Interfaces:**

- Produces: `createRawBodyMiddleware`, `validateQuery`, `matchDisasterAwareRoute`, `createForwardHeaders`, `fetchWithTimeout`, `createRateLimitMiddleware`。
- Consumes: Express `Request`/`Response`、node-fetch `RequestInit`、`UpstreamFetch` 兼容签名。

- [x] **Step 1: 写入失败测试**

```ts
test("unknown proxy paths and unsupported methods never reach the upstream", async () => {
  const response = await fetch(`${testApp.baseUrl}/api/unknown`);
  assert.equal(response.status, 404);
  assert.equal(upstreamCalls, 0);
});
```

- [x] **Step 2: 运行失败测试**

Run: `pnpm run test:bff`

Expected: 新测试因当前通用 `/api` 代理访问上游而失败。

- [x] **Step 3: 实现最小边界模块**

```ts
export const matchDisasterAwareRoute = (method: string, pathname: string) => {
  if (method !== "GET") return { kind: "method_not_allowed" } as const;
  if (pathname === "/hazards/types" || pathname === "/hazards/active")
    return { kind: "allowed" } as const;
  return { kind: "not_found" } as const;
};
```

再实现 64 KiB body 限制、query 限制、请求头白名单、固定窗口限流和 abort 超时；每个失败使用设计文档中的稳定错误码。

- [x] **Step 4: 运行任务测试**

Run: `pnpm run test:bff`

Expected: BFF 测试全部通过。

### Task 2: 将 Express 路由收口到受限代理

**Files:**

- Modify: `server.ts`
- Modify: `tests/server-auth.test.ts`

**Interfaces:**

- Consumes: Task 1 的所有边界工具。
- Produces: 仅暴露三条灾害 GET 代理路径、认证和 AI 限流、脱敏上游错误。

- [x] **Step 1: 写入失败测试**

```ts
test("proxy forwards only approved headers and always injects the server token", async () => {
  const response = await fetch(`${testApp.baseUrl}/api/hazards/active`, {
    headers: {
      authorization: "Bearer browser-token",
      cookie: "session=x",
      "x-forwarded-host": "evil.test",
    },
  });
  assert.equal(response.status, 200);
  assert.equal(upstreamHeaders.authorization, "Bearer server-token");
  assert.equal(upstreamHeaders.cookie, undefined);
});
```

- [x] **Step 2: 运行失败测试**

Run: `pnpm run test:bff`

Expected: 当前测试会观察到未白名单头仍被转发，或路径仍由通用代理处理。

- [x] **Step 3: 最小路由改造**

```ts
app.get("/api/hazards/types", validateQuery, proxyDisasterAware);
app.get("/api/hazards/active", validateQuery, proxyDisasterAware);
app.get("/api/hazards/active/category/:categoryId", validateQuery, proxyDisasterAware);
app.use("/api", apiNotFoundHandler);
```

认证和 AI 路由前分别绑定 `createRateLimitMiddleware`；上游获取和刷新 token 统一使用 `fetchWithTimeout`。所有 BFF 错误都通过安全错误响应返回。

- [x] **Step 4: 运行任务测试**

Run: `pnpm run test:bff`

Expected: BFF 测试全部通过，覆盖 allowlist、头部、body、query、限流和超时。

### Task 3: 更新运行配置和项目记录

**Files:**

- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

**Interfaces:**

- Consumes: Task 2 的环境变量和错误契约。
- Produces: 可配置的 BFF 边界说明与准确的待优化项状态。

- [x] **Step 1: 写入验证性断言或文档检查**

```ts
assert.match(readFileSync(".env.example", "utf8"), /DISASTERAWARE_REQUEST_TIMEOUT_MS/);
```

- [x] **Step 2: 运行失败检查**

Run: `rg "DISASTERAWARE_REQUEST_TIMEOUT_MS" .env.example README.md`

Expected: 当前输出为空。

- [x] **Step 3: 补充最小配置与文档**

```dotenv
DISASTERAWARE_REQUEST_TIMEOUT_MS=10000
BFF_AUTHORIZE_RATE_LIMIT_MAX=10
BFF_AI_RATE_LIMIT_MAX=30
```

文档必须说明 60 秒窗口、单进程适用范围和多实例由入口网关统一限流的要求。

- [x] **Step 4: 运行格式与文档检查**

Run: `pnpm run format:check && git diff --check`

Expected: 命令退出码为 0。

### Task 4: 整体回归和复核

**Files:**

- Verify: `server.ts`, `server/security/request-boundaries.ts`, `tests/server-auth.test.ts`

- [x] **Step 1: 运行完整项目基线**

Run: `pnpm run test:baseline`

Expected: lint、格式、双端类型检查、BFF/Service/组件/E2E 测试和构建全部通过。

- [x] **Step 2: 运行差异完整性检查**

Run: `git diff --check && git status --short`

Expected: 没有空白错误；状态只列出本任务文件。

- [x] **Step 3: 执行任务级与整体代码复核**

对 Task 1、Task 2 分别执行实现复核；完成后独立复核完整差异，优先检查路由绕过、限流键、敏感头、错误泄露与测试盲区。
