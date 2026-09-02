### Task 1：建立统一 HTTP 客户端和错误契约

**文件：**

- 新增：`src/services/http/serviceError.ts`
- 新增：`src/services/http/httpClient.ts`
- 测试：`tests/service-http.test.ts`

**接口：**

```typescript
export type ServiceErrorCode = "network" | "timeout" | "http" | "invalid_json";

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly status?: number;
  readonly cause?: unknown;
}

export function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { timeoutMs?: number; retries?: number },
): Promise<T>;

export function requestText(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { timeoutMs?: number; retries?: number },
): Promise<string>;

export function requestStream(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { timeoutMs?: number },
): Promise<Response>;
```

- [ ] **步骤 1：编写失败测试**，覆盖 JSON/文本成功、带状态码和正文的 HTTP 失败、超时转换、网络失败、JSON 解析失败，以及仅对网络错误、超时、429 和 5xx 进行重试。
- [ ] **步骤 2：运行聚焦测试命令**：`npm run test:services`。
- [ ] **步骤 3：实现最小 HTTP 客户端**，使用 `AbortController`、`response.ok`、响应正文读取和基于 `unknown` 的错误收窄。
- [ ] \*\*步骤 4：将 `retries` 定义为最大总尝试次数，默认值为 1；4xx（429 除外）不重试，POST 请求默认不重试。
- [ ] **步骤 5：运行 `npm test`、`npm run typecheck:client` 和 `npm run build`**，确认新增客户端代码不破坏应用构建。
