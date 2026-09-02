### Task 4：迁移 AI 服务和所有剩余调用方

**文件：**

- 新增：`src/services/ai/aiAssistantService.ts`
- 新增：`src/utils/aiAssistant.ts`
- 修改：`src/api/aiAssistant.ts`
- 修改：`src/components/AIChatAssistant.tsx`
- 修改：`src/App.tsx`（如果任务 2 后仍有鉴权导入）
- 测试：`tests/service-ai.test.ts`

**接口：**

```typescript
export async function streamChatMessage(
  messages: readonly ChatMessage[],
  context: DisasterContext | undefined,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (message: string) => void,
): Promise<void>;
```

- [ ] **步骤 1：编写失败测试**，覆盖 BFF 请求结构、流式 Chat Completions 增量、`[DONE]`、畸形数据块、503 Demo 降级和非 Demo 错误。
- [ ] **步骤 2：运行 `npm test`**，确认 service 实现迁移前新增测试失败。
- [ ] **步骤 3：仅将网络请求和 Demo 降级逻辑移动到 `aiAssistantService.ts`**；消息 ID、时间格式化、快捷提示等纯展示辅助函数移动到 `src/utils/aiAssistant.ts`。
- [ ] **步骤 4：将 `src/api/aiAssistant.ts` 改为兼容 facade**，并更新 `AIChatAssistant.tsx`，分别从 service 和 utils 导入。
- [ ] **步骤 5：运行 `npm test`、`npm run lint` 和 `npm run build`**，确认浏览器仍只发送 `POST /api/ai/chat`，且不会读取 provider 凭据。
