# AI 流式会话生命周期治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 AI 助手的流式请求可取消、可区分完成/中断/失败，并在关闭、清空、卸载、超时和网络断开时保持可靠的会话状态。

**Architecture:** `aiAssistantService` 负责浏览器 fetch、SSE 增量解码、Demo 延迟和 `AbortSignal`，通过判别结果反馈终态。新建 `useAIChatSession` 管理请求序号、消息、重试快照及 React 生命周期，组件只渲染和转发交互。BFF 保持统一 Chat Completions SSE 输出，将上游体读取纳入完整超时与断连取消范围。

**Tech Stack:** React 19、TypeScript 5.9、Fetch/ReadableStream/AbortController、Express 5、Node Transform、Vitest、Node test。

## Global Constraints

- 停止、关闭、清空和卸载必须取消浏览器和 BFF 上游请求；主动取消保留已生成文字且不显示失败告警。
- 只允许一条活动会话请求；请求 ID 防止旧 chunk、完成、失败或 finally 更新当前会话。
- 不自动重试已经开始输出的请求；手动重试使用原请求快照，不重复追加用户消息；取消或失败回答不进入下一轮模型输入。
- `streamChatMessage` 接收 `AbortSignal`，返回 `completed`、`cancelled` 或 `failed` 判别结果；不得由 Service 直接更新 React 状态。
- 支持 UTF-8、CRLF/LF、跨 chunk 事件、最后无换行尾部、SSE 注释、多行 data 和 `[DONE]`；EOF 未收到完成标记、损坏 JSON、provider failed/incomplete/error 都是失败。
- BFF 每个 provider attempt 的超时覆盖连接和响应体到结束；客户端断开 abort 上游且停止 fallback；流已经开始时不切换 provider。
- 复用 BFF 权威限制：最多 50 条消息、单条最多 8000 字符、请求体最大 64 KiB。前端在发送前执行相同限制并以 UTF-8 字节数限制模型历史；界面历史不删除。
- 不引入状态库、会话持久化、自动重连、货币额度或跨实例限流；不修改 Python 服务、地图和 Analytics Hook。
- 先运行 `git status --short`，保留工作区已有的设计文档；不暂存、不提交、不推送。

---

### Task 1: 可取消的浏览器 SSE Service

**Files:**

- Modify: `src/services/ai/aiAssistantService.ts`
- Modify: `tests/service-ai.test.ts`

**Interfaces:**

```ts
export type AIStreamOutcome =
  | { kind: "completed" }
  | { kind: "cancelled" }
  | { kind: "failed"; message: string };

export interface StreamChatOptions {
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
}

export async function streamChatMessage(
  messages: readonly ChatMessage[],
  context: DisasterContext | undefined,
  options: StreamChatOptions,
): Promise<AIStreamOutcome>;
```

- [ ] **Step 1: 写失败的取消与不完整流测试**

```ts
it("returns cancelled and releases the reader when its signal aborts", async () => {
  const controller = new AbortController();
  const cancel = vi.fn();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responseWithBlockingReader(cancel)));
  const pending = streamChatMessage(messages, undefined, {
    signal: controller.signal,
    onChunk: vi.fn(),
  });
  controller.abort();

  await expect(pending).resolves.toEqual({ kind: "cancelled" });
  expect(cancel).toHaveBeenCalledOnce();
});

it("fails when EOF arrives without a done marker", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(sseResponse('data: {"choices":[{"delta":{"content":"半段"}}]}\n')),
  );
  await expect(streamChatMessage(messages, undefined, { onChunk: vi.fn() })).resolves.toEqual({
    kind: "failed",
    message: "AI 响应流意外中断，请重试。",
  });
});
```

- [ ] **Step 2: 运行 Service 测试确认 RED**

Run: `pnpm run test:services -- tests/service-ai.test.ts`

Expected: FAIL，因为当前函数没有 options、取消终态或缺失 DONE 检测。

- [ ] **Step 3: 实现最小可取消读取与 SSE 解码**

```ts
const streamResult = await readChatCompletionEvents(
  reader,
  decoder,
  options.signal,
  options.onChunk,
);
if (streamResult.done) return { kind: "completed" };
return { kind: "failed", message: "AI 响应流意外中断，请重试。" };
```

实现 `readChatCompletionEvents`：使用 `TextDecoder.decode(value, { stream: true })` 累积事件，以空行分隔，合并 `data:` 多行，忽略 `:` 注释；收到 `[DONE]` 后仅返回一次完成。每次 `reader.read()` 前和捕获 `AbortError` 时检查 signal；在 `finally` 执行 `reader.cancel()`（未完成时）及 `reader.releaseLock()`。在循环结束调用 `decoder.decode()` 并处理最后未换行事件。Demo 模式的等待 Promise 监听 signal，取消时返回 `cancelled`，不调用 onChunk。

- [ ] **Step 4: 补齐协议与失败测试**

增加 CRLF、分割 UTF-8 中文字符、分割 JSON 事件、多行 data、注释心跳、DONE 后附加数据、malformed JSON、`error` SSE 事件、HTTP 非 2xx、预取消和 Demo 取消测试。成功流只允许 `completed`；错误文案不包含 BFF 或 provider 返回的原始正文。

- [ ] **Step 5: 运行测试确认 GREEN**

Run: `pnpm run test:services -- tests/service-ai.test.ts`

Expected: 所有 AI Service 测试通过。

### Task 2: BFF 全程超时、断连与流终态

**Files:**

- Modify: `server/ai/ai-chat-route.ts`
- Modify: `server/ai/ai-stream.ts`
- Modify: `tests/ai-stream.test.ts`
- Modify: `tests/server-auth.test.ts`

**Interfaces:**

```ts
export type StreamTerminalEvent =
  | { kind: "done" }
  | { kind: "failed"; code: "AI_PROVIDER_STREAM_FAILED" | "AI_PROVIDER_STREAM_INCOMPLETE" };

export function createResponsesToChatCompletionsStream(
  onTerminal?: (event: StreamTerminalEvent) => void,
): Transform;
```

- [ ] **Step 1: 写失败的 provider 失败事件与上游体超时测试**

```ts
test("responses failed event produces a safe error event instead of DONE", () => {
  const output = convertResponsesSSEToChatCompletionsSSE('data: {"type":"response.failed"}\n\n');
  assert.match(output, /AI_PROVIDER_STREAM_FAILED/);
  assert.doesNotMatch(output, /\[DONE\]/);
});

test("streaming provider body is aborted when its timeout expires", async () => {
  const app = await startTestApp({ stalledStreamingProvider: true, timeoutMs: 1 });
  const response = await fetch(`${app.baseUrl}/api/ai/chat`, { method: "POST", body: validAiBody });
  await assert.rejects(response.text(), /terminated|aborted/i);
  assert.equal(app.providerAbortCount, 1);
});
```

- [ ] **Step 2: 运行 BFF 测试确认 RED**

Run: `pnpm run test:bff`

Expected: FAIL，因为 `response.failed` 当前转换为 DONE，且成功响应头清除 timer。

- [ ] **Step 3: 保持超时到流结束并安全转发终态**

在每个 provider attempt 保存 `timeout`、`AbortController`、`clientClosed` 与清理函数。只有在源流 `end`、`error`、`close` 或 client `close` 后清理 timer。client close 必须 abort controller；未收到任何输出前允许下一 provider，开始 `res.write` 后不得 fallback。

在 `ai-stream.ts` 中把 provider `response.failed`、`response.incomplete`、workflow failure/错误事件转换成：

```ts
`event: error\ndata: ${JSON.stringify({ code: "AI_PROVIDER_STREAM_FAILED", message: "AI provider stream failed." })}\n\n`;
```

仅明确的 completed/`[DONE]` 产生 DONE。转换流调用一次 `onTerminal`，路由据此结束响应、记录正确状态并销毁上游流。

- [ ] **Step 4: 补齐断连、清理与异常测试**

增加客户端在响应头前关闭、流中关闭、workflow JSON 读取超时、转换流 error、Responses incomplete、workflow failure、正常完成 timer 清理、客户端断连不触发 fallback 的测试。断连和 provider 错误日志不得包含 prompt、token 或上游正文。

- [ ] **Step 5: 运行 BFF 测试确认 GREEN**

Run: `pnpm run test:bff`

Expected: 全部 BFF 测试通过。

### Task 3: React 会话状态、停止与手动重试

**Files:**

- Create: `src/hooks/useAIChatSession.ts`
- Modify: `src/components/AIChatAssistant.tsx`
- Create: `tests/component/ai-chat-assistant.test.tsx`
- Modify: `tests/component/setup.ts`（仅在缺失 polyfill 时）

**Interfaces:**

```ts
export interface AIChatSession {
  messages: readonly ChatMessage[];
  input: string;
  errorText: string;
  isStreaming: boolean;
  canRetry: boolean;
  setInput(value: string): void;
  send(text: string): Promise<void>;
  stop(): void;
  clear(): void;
  retry(): Promise<void>;
  close(): void;
}

export function useAIChatSession(
  isOpen: boolean,
  onClose: () => void,
  context: DisasterContext | undefined,
): AIChatSession;
```

- [ ] **Step 1: 写失败的组件生命周期测试**

```tsx
it("cancels generation when the close button is pressed and ignores a late chunk", async () => {
  const deferred = createDeferredStream();
  vi.mocked(streamChatMessage).mockImplementation(deferred.start);
  render(<AIChatAssistant isOpen onClose={onClose} hazards={hazards} />);
  await user.type(screen.getByRole("textbox"), "分析洪水");
  await user.click(screen.getByTitle("发送"));
  await user.click(screen.getByRole("button", { name: "关闭 AI 助手" }));
  deferred.emit("旧内容");

  expect(deferred.signal.aborted).toBe(true);
  expect(screen.queryByText("旧内容")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 运行组件测试确认 RED**

Run: `pnpm run test:component -- tests/component/ai-chat-assistant.test.tsx`

Expected: FAIL，因为当前组件没有取消控制器、停止入口或请求序号。

- [ ] **Step 3: 实现会话 Hook 与组件接线**

Hook 使用 `requestIdRef`、`controllerRef`、`mountedRef`、`activeRequestRef` 和 `retrySnapshotRef`。`stop` 先递增 request ID 再 abort；任何 chunk/完成/失败更新前验证 mounted 和 ID。`clear`、`close`、isOpen 变 false、卸载都复用 stop。关闭后调用 onClose，保留会话；清空清除消息、错误与重试快照。

`send` 先检查 `isStreaming`，验证不为空、消息数不超过 50、当前输入不超过 8000 字符及序列化请求不超过 64 KiB；按最近完整 user/assistant 轮次组装模型历史。加入用户和空助手消息后调用 Service；`completed` 将流消息标记完成，`cancelled` 标记“已停止”，`failed` 保留已生成文本、显示安全错误并保存重试快照。`retry` 移除对应未完成助手消息并复用快照，不重复插入 user 消息。

组件改为使用 Hook；关闭按钮添加 `aria-label="关闭 AI 助手"`；生成中显示“停止生成”按钮并调用 stop；清空调用 clear；错误区显示“重试”按钮（仅 canRetry）。输入的 Enter 处理跳过 `event.nativeEvent.isComposing`。

- [ ] **Step 4: 补齐组件行为测试**

覆盖停止后立即重新发送、清空后晚到 chunk、isOpen 变 false、卸载、重复 Enter/快捷按钮、部分内容失败保留、重试不新增 user 消息、取消不显示错误、超长输入、超过 50 条模型历史、中文 UTF-8 64 KiB 边界和输入法组合 Enter。

- [ ] **Step 5: 运行组件与相关 Service 测试确认 GREEN**

Run: `pnpm run test:component -- tests/component/ai-chat-assistant.test.tsx && pnpm run test:services -- tests/service-ai.test.ts`

Expected: 全部测试通过。

### Task 4: 回归、文档与优化清单

**Files:**

- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `README.md`（仅当现有 AI 说明需要补充停止/断流行为）

- [ ] **Step 1: 更新优化清单**

将“AI 流式会话生命周期治理”从优先级矩阵移至“已完成优化项”，记录取消、请求序号、手动重试、流协议终态、全程超时和新增测试。保留账户级成本预算、多实例限额和自动重连为后续范围。

- [ ] **Step 2: 运行完整质量门禁**

Run: `pnpm run lint && pnpm run format:check && pnpm test && pnpm run test:component && pnpm run typecheck:client && pnpm run typecheck:server && pnpm run build && git diff --check`

Expected: 全部命令退出码为 0；若沙箱阻止 Express 监听端口，以受控权限重跑 `pnpm test` 并记录该环境差异。

- [ ] **Step 3: 检查最终改动范围**

Run: `git status --short && git diff --stat`

Expected: 仅包含 AI 流式会话、对应测试与文档；不暂存、不提交、不推送。

## Plan self-review

- 覆盖：设计中的浏览器取消/状态、防旧回写、手动重试、输入预算、SSE 半包与终态、BFF 全程超时/断连、测试及文档均有任务。
- 协议一致性：Service、Hook、组件和 BFF 使用 completed/cancelled/failed 三类浏览器终态与独立 BFF 安全错误事件；主动取消不转为失败。
- 范围：没有引入自动重连、持久化、状态库、跨实例配额或与 AI 生命周期无关的重构。
