### Task 1: 明确通用 JSON 边界与授权响应契约

**Files:**

- Modify: `src/services/http/httpClient.ts`
- Modify: `src/services/http/serviceError.ts`
- Modify: `src/services/auth/authService.ts`
- Modify: `tests/service-http.test.ts`
- Create: `tests/service-auth.test.ts`

**Interfaces:**

```ts
export type ServiceErrorCode = "network" | "timeout" | "http" | "invalid_json" | "invalid_response";

export async function requestJson(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: HttpRequestOptions,
): Promise<unknown>;

function parseAuthorizeResponse(value: unknown): { authorized: true };
```

- [ ] **Step 1: 写 HTTP 与授权失败测试**

在 `tests/service-http.test.ts` 将成功断言改为 `const payload: unknown = await requestJson(...)`，再用局部类型守卫读取 `ok`，证明 HTTP 层不产生静态领域类型；保留无效 JSON、HTTP 错误、超时、取消和重试测试。新增 `tests/service-auth.test.ts`，mock `requestJson`，断言 `{ authorized: true }` 后 `getAccessToken()` 返回 `bff-managed`，`{ authorized: false }`、缺失字段和非对象值均抛出 `ServiceError` 且 `code` 是 `invalid_response`。

```ts
it("rejects a syntactically valid but invalid authorize response", async () => {
  requestJsonMock.mockResolvedValue({ authorized: false });
  await expect(authorize()).rejects.toMatchObject({ code: "invalid_response" });
  expect(getAccessToken()).toBe("");
});
```

- [ ] **Step 2: 运行定向测试确认 RED**

运行：`pnpm exec vitest run tests/service-http.test.ts tests/service-auth.test.ts`

预期：`tests/service-auth.test.ts` 因授权响应未解析而失败；HTTP 成功测试需要按 `unknown` 语义调整。

- [ ] **Step 3: 实现最小 HTTP 与授权解析**

将 `requestJson<T>` 改为不带泛型的 `requestJson(...): Promise<unknown>`，保留 `JSON.parse(responseText)` 的原始结果。向错误码联合添加 `invalid_response`。在 `authService.ts` 增加本地对象守卫，只接受严格 `authorized === true`，再设置模块级授权状态；其它 JSON 值抛出固定文案的 `new ServiceError("Authorization response is invalid", "invalid_response")`。

```ts
function parseAuthorizeResponse(value: unknown): { authorized: true } {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { authorized?: unknown }).authorized !== true
  ) {
    throw new ServiceError("Authorization response is invalid", "invalid_response");
  }
  return { authorized: true };
}

export async function authorize(): Promise<void> {
  parseAuthorizeResponse(
    await requestJson("/api/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );
  authorized = true;
}
```

- [ ] **Step 4: 运行 GREEN 与类型检查**

运行：`pnpm exec vitest run tests/service-http.test.ts tests/service-auth.test.ts && pnpm run typecheck:client`

预期：两份测试通过；客户端 TypeScript 检查无 `requestJson` 泛型残留。
