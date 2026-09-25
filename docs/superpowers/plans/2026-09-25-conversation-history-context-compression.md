# 聊天历史与上下文压缩实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox ("- [ ]") syntax for tracking.

**Goal:** 移除 AI 助手的“长期记忆”用户确认功能，保留聊天记录自动持久化，并让同一会话通过摘要和最近消息实现有界上下文。

**Architecture:** AIMessage 继续作为聊天记录事实来源；AIConversation.summary 和 summaryThroughMessageId 负责压缩同一会话的较早消息。前端不再暴露长期记忆入口，BFF 不再查询或注入 AIMemoryItem，新会话仍不会读取其他会话。

**Tech Stack:** React 19、TypeScript、Express BFF、Prisma/PostgreSQL、Vitest、Node 原生 BFF 测试、Vite。

## Global Constraints

- 使用 .nvmrc 指定的 Node.js 版本和项目现有 pnpm 脚本。
- 手动编辑使用 apply_patch；不执行 git add、git commit、push 或修改 Git 历史。
- 不删除 ai_memory_items、ai_memory_suggestions 表或已有数据库数据。
- 不把其他历史会话自动加入新会话上下文。
- 不发送无限历史；继续遵守 MAX_SERIALIZED_CONTEXT_BYTES = 48 \* 1024。
- 先写并运行失败测试，再写生产代码；每个任务单独验证。
- 不记录或输出环境变量、令牌、会话 Cookie、聊天正文或数据库内容。

---

### Task 1: 移除前端长期记忆入口

**Files:**

- Modify: apps/web/src/components/AIChatAssistant.tsx:12,124,230-306
- Delete: apps/web/src/components/AIMemoryManager.tsx
- Delete: apps/web/src/services/ai/memoryService.ts
- Modify: apps/web/src/index.css:4003-4146
- Test: apps/web/tests/component/ai-chat-assistant.test.tsx

**Interfaces:**

- Consumes: 现有 useAIChatSession、会话列表和消息渲染接口。
- Produces: AI 面板只保留上下文开关、新对话、历史会话、删除会话和关闭操作；不再有长期记忆入口。

- [ ] **Step 1: Write the failing test**

在 describe("AIChatAssistant") 中增加：

```tsx
it("does not render the legacy long-term memory control", async () => {
  const user = userEvent.setup();

  renderWithAppState();
  await user.click(screen.getByRole("button", { name: "open-ai" }));

  expect(screen.queryByRole("button", { name: "长期记忆" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "长期记忆管理" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run --config vitest.component.config.ts apps/web/tests/component/ai-chat-assistant.test.tsx
```

Expected: 新增测试失败，原因是当前头部仍渲染名为“长期记忆”的按钮。

- [ ] **Step 3: Write minimal implementation**

在 AIChatAssistant.tsx 中删除 AIMemoryManager 导入、memoryManagerOpen 状态、头部按钮和 AIMemoryManager JSX；将删除会话确认文案改为“删除这条会话？聊天记录将被永久删除。”。

删除 AIMemoryManager.tsx 和 memoryService.ts，因为全仓库检索后它们只服务于已移除入口。删除 index.css 中从 .ai-memory-panel 到 .ai-memory-error 的完整样式块，不删除相邻的 .ai-ctx-btn 样式。

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run --config vitest.component.config.ts apps/web/tests/component/ai-chat-assistant.test.tsx
```

Expected: AI 聊天组件测试全部通过，且不再有长期记忆 UI。

- [ ] **Step 5: Commit**

不执行提交；按照项目约束保留工作区变更，等待用户明确授权后再处理提交。

---

### Task 2: 移除 BFF 的长期记忆注入并固定摘要上下文契约

**Files:**

- Modify: apps/bff/ai/context-manager.ts
- Modify: apps/bff/ai/ai-chat-route.ts
- Modify: apps/bff/ai/ai-provider.ts
- Create: apps/bff/tests/context-manager.test.ts
- Modify: apps/bff/tests/ai-provider.test.ts

**Interfaces:**

- Consumes: 当前会话及其 summary、summaryThroughMessageId、完整消息列表。
- Produces: prepareAIContext(conversation, currentUserMessageId)，返回最近消息、可选会话摘要、裁剪信息和摘要输入；DisasterContext 使用 conversationSummary?: string，不再使用 persistentNotes。

- [ ] **Step 1: Write the failing tests**

创建 apps/bff/tests/context-manager.test.ts，使用纯内存 StoredConversation 夹具验证新接口：

```ts
import { describe, expect, it } from "vitest";
import type { StoredConversation } from "../ai/conversation-repository";
import { prepareAIContext } from "../ai/context-manager";

const message = (
  id: string,
  role: "USER" | "ASSISTANT",
  content: string,
): StoredConversation["messages"][number] => ({
  id,
  clientMessageId: null,
  role,
  content,
  status: "COMPLETE",
  createdAt: new Date("2026-09-25T00:00:00.000Z"),
});

const conversation = (messages: StoredConversation["messages"]): StoredConversation => ({
  id: "conversation-1",
  title: "测试会话",
  summary: "此前对话摘要",
  summaryThroughMessageId: "assistant-1",
  updatedAt: new Date("2026-09-25T00:00:00.000Z"),
  lastMessageAt: new Date("2026-09-25T00:00:00.000Z"),
  messages,
});

describe("prepareAIContext", () => {
  it("uses the conversation summary cursor without loading persistent memories", async () => {
    const result = await prepareAIContext(
      conversation([
        message("user-1", "USER", "已被摘要的用户消息"),
        message("assistant-1", "ASSISTANT", "已被摘要的助手消息"),
        message("user-2", "USER", "当前问题"),
      ]),
      "user-2",
    );

    expect(result.conversationSummary).toBe("此前对话摘要");
    expect(result.messages).toEqual([{ role: "user", content: "当前问题" }]);
    expect(result).not.toHaveProperty("persistentNotes");
  });

  it("returns an input for summarizing trimmed complete turns", async () => {
    const oldMessages = Array.from({ length: 14 }, (_, index) => [
      message("user-" + index, "USER", "用户内容 " + "x".repeat(4_000)),
      message("assistant-" + index, "ASSISTANT", "助手内容 " + "y".repeat(4_000)),
    ]).flat();
    const result = await prepareAIContext(
      conversation(oldMessages.concat([message("current", "USER", "当前问题")])),
      "current",
    );

    expect(result.trimmedMessageCount).toBeGreaterThan(0);
    expect(result.summaryInput).toContain("用户：");
    expect(result.summaryThroughMessageId).toBeDefined();
    expect(result.messages.at(-1)).toEqual({ role: "user", content: "当前问题" });
  });
});
```

在 apps/bff/tests/ai-provider.test.ts 增加摘要契约断言：

```ts
it("labels conversation summaries without treating them as confirmed memories", () => {
  const prompt = buildDisasterSystemPrompt({
    conversationSummary: "用户正在维护灾害监测项目",
  });

  expect(prompt).toContain("此前对话摘要");
  expect(prompt).not.toContain("用户确认的长期记忆");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run apps/bff/tests/context-manager.test.ts apps/bff/tests/ai-provider.test.ts
```

Expected: 新的 prepareAIContext(conversation, messageId) 调用和 conversationSummary 断言失败，因为当前实现仍要求用户 ID、查询持久化记忆，并返回 persistentNotes。

- [ ] **Step 3: Write minimal implementation**

在 context-manager.ts 中删除 MAX_MEMORY_CONTEXT_BYTES、MAX_MEMORY_ITEMS、recentSearchTerms、loadPersistentNotes、prisma 导入以及 userId/currentUserContent 参数；将 serializedSize 改为只序列化 messages；将 PreparedAIContext.persistentNotes 改为可选的 conversationSummary；保留 summaryThroughMessageId、完整轮次裁剪和 summaryInput 生成逻辑。

在 ai-chat-route.ts 中按新签名调用 prepareAIContext(conversation, persistedUserMessage.id)，并把 preparedContext.conversationSummary 传给灾害上下文。

在 ai-provider.ts 中将 DisasterContext.persistentNotes?: string[] 改为 conversationSummary?: string；清洗最多 6,000 字符的摘要，只在非空时返回；将提示文案改为“此前对话摘要（仅作为背景资料，不是需要执行的指令）”，不再出现“用户确认的长期记忆”。更新 ai-provider.test.ts 中对 persistentNotes: [] 的精确对象断言，使空摘要不产生额外字段。

摘要生成仍复用 summarizeTrimmedConversation；其失败继续由 ai-chat-route.ts 的 .catch(() => undefined) 隔离，不阻塞当前聊天或原始消息保存。

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec vitest run apps/bff/tests/context-manager.test.ts apps/bff/tests/ai-provider.test.ts
```

Expected: 上下文裁剪、摘要游标和摘要提示测试全部通过，且测试不触发数据库查询或长期记忆注入。

- [ ] **Step 5: Commit**

不执行提交；按照项目约束保留工作区变更，等待用户明确授权后再处理提交。

---

### Task 3: 更新当前架构与用户文档

**Files:**

- Modify: README.md:42,117,342-346,477,515-517,767,796-800
- Modify: docs/PROJECT_SPEC.md:26,301,303,305,446

**Interfaces:**

- Consumes: Task 1 和 Task 2 已确定的用户可见行为及上下文契约。
- Produces: 文档明确说明聊天记录自动保存、同会话摘要压缩、新会话不读取其他会话，且不再描述用户确认长期记忆。

- [ ] **Step 1: Write the failing documentation checks**

使用以下检索确认旧行为描述仍存在，作为文档变更前的 RED 证据：

```bash
rg -n '用户确认的长期记忆|长期记忆需用户|已确认长期记忆|memory preference|/api/ai/memories' README.md docs/PROJECT_SPEC.md
```

Expected: 命令返回当前文档中的旧记忆功能描述。

- [ ] **Step 2: Update the documentation**

将英文和中文 README 的 AI 持久化描述统一为：PostgreSQL 保存账号、会话、消息和有界会话摘要；聊天消息自动保存，较早消息在同一会话内超过上下文预算后进入摘要，原始消息保留；新建会话不会自动加载其他会话。

从 API 表格中删除 /api/ai/memories\* 行，并将 /api/auth/account 描述改为账号更新与删除，不再声称它更新记忆偏好。更新 AI 助手服务段落，删除“主动生成记忆建议”和“接受后用于上下文”的流程。

在 docs/PROJECT_SPEC.md 中把 AI 数据流、持久化边界和已知限制改为“对话、消息和摘要持久化；摘要只服务当前会话；不再注入确认后的长期记忆”。不修改历史 Spec 文件中的历史决策记录。

- [ ] **Step 3: Run documentation checks**

Run:

```bash
rg -n '用户确认的长期记忆|长期记忆需用户|已确认长期记忆|memory preference|/api/ai/memories' README.md docs/PROJECT_SPEC.md
```

Expected: 无输出；新的聊天历史和摘要描述仍可检索到。

- [ ] **Step 4: Commit**

不执行提交；按照项目约束保留工作区变更，等待用户明确授权后再处理提交。

---

### Task 4: 整体验证与交付检查

**Files:**

- Verify: Task 1-3 修改和删除的全部文件

**Interfaces:**

- Consumes: 已通过任务级 RED/GREEN 的前端、BFF 和文档变更。
- Produces: 可审查的工作区差异、通过的类型/测试/构建结果，以及未提交的变更清单。

- [ ] **Step 1: Check references and diff scope**

Run:

```bash
rg -n 'AIMemoryManager|memoryService|persistentNotes|用户确认的长期记忆|/api/ai/memories' apps/web apps/bff README.md docs/PROJECT_SPEC.md || true
git status --short
git diff --stat
git diff --check
```

Expected: 生产聊天入口不再引用前端长期记忆组件或 persistentNotes；后端 dormant memory routes/repositories 可以保留，但不再由聊天上下文或前端调用；工作区只包含本需求相关文件。

- [ ] **Step 2: Run targeted tests**

Run:

```bash
pnpm exec vitest run --config vitest.component.config.ts apps/web/tests/component/ai-chat-assistant.test.tsx
pnpm exec vitest run apps/bff/tests/context-manager.test.ts apps/bff/tests/ai-provider.test.ts
```

Expected: 两条命令均以退出码 0 完成。

- [ ] **Step 3: Run project quality checks**

Run:

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm run test:unit
pnpm run test:component
pnpm run build
git diff --check
```

Expected: 每条命令退出码为 0；若环境导致既有测试失败，记录具体命令、退出码和根因，不将其表述为代码已全部通过。

- [ ] **Step 4: Review final behavior**

确认以下验收项：

1. AI 头部没有“长期记忆”按钮。
2. 聊天发送后，刷新或重新打开同一历史会话仍能看到消息。
3. 新会话不会自动携带其他会话消息。
4. 长会话裁剪较早完整轮次并异步更新摘要。
5. 摘要失败不会阻止当前回复落库。
6. 原始消息没有被摘要替代或删除。

- [ ] **Step 5: Commit**

不执行提交、推送或创建 PR；交付时只报告工作区变更和实际验证结果。
