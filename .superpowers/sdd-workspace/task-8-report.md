# Task 8 报告：AI Service 回归测试迁移

## 修改内容

- 仅修改 `tests/service-ai.test.ts`，使用 `PersistedChatInput` fixture（`conversationId`、`clientMessageId`、`content`）替换旧的 `ChatMessage[]` 输入。
- 将请求断言更新为 `/api/ai/conversations/:conversationId/messages`，并检查 `clientMessageId`、`content` 与 `disasterContext` 请求体。
- Demo 用例现在依次模拟配置错误响应和成功的持久化响应；断言同一会话的 `/demo-reply` 请求及 `{ userClientMessageId, content }` 请求体。取消用例确认回复尚未完成时只发送了初始请求。
- 原有 canonical disaster context、SSE 解析、断线恢复、取消、安全错误和 Demo 回复覆盖均保留。

## RED 基线

父任务提供的基线结果：`pnpm exec vitest run tests/service-ai.test.ts` 为 **19 passed, 5 failed**。失败是旧 `/api/ai/chat` endpoint、旧 `ChatMessage[]` 输入断言，以及 Demo 模式没有模拟新增的持久化请求。

## 最终验证

命令：

```text
pnpm exec vitest run tests/service-ai.test.ts
```

实际 Vitest 输出：

```text
 RUN  v3.2.7 /Users/jamie/.codex/worktrees/user-auth-ai-persistence/prometheus-global-guardian

 ✓ tests/service-ai.test.ts (24 tests) 4233ms
   ✓ AI 助手 Service > EOF 缺少 DONE 标记时失败并保留已有增量  1405ms
   ✓ AI 助手 Service > 无响应流时返回失败  1403ms
   ✓ AI 助手 Service > 网络异常不泄露原始错误  1405ms

 Test Files  1 passed (1)
      Tests  24 passed (24)
   Start at  19:56:30
   Duration  4.42s (transform 31ms, setup 0ms, collect 35ms, tests 4.23s, environment 0ms, prepare 33ms)
```

进程退出码：`0`。

## 备注

迁移期间首次运行时曾有一处未替换的 `messages` 标识符导致单个用例失败，随后改为新的 `message` fixture；最终指定命令重跑后 24 项全部通过。Shell 启动时另有 `.zprofile` 中两条 `/opt/homebrew/bin/brew` 路径不存在的提示，不影响 Vitest 运行。
