## Task 8: Migrate the AI Service regression suite

**Scope:** migrate only `tests/service-ai.test.ts` to the current persisted conversation API; do not edit production files or other test files.

- Current contract: `streamChatMessage(message: PersistedChatInput, context, options)` receives `{ conversationId, clientMessageId, content }`, posts to `/api/ai/conversations/:conversationId/messages`, and sends `{ clientMessageId, content, disasterContext }`. Demo fallback persists through `/api/ai/conversations/:conversationId/demo-reply` with `{ userClientMessageId, content }`.
- [ ] Preserve the current coverage for canonical disaster context, SSE parsing, reconnect, abort, safe errors and Demo fallback.
- [ ] Build `PersistedChatInput` fixtures with `conversationId`, `clientMessageId` and `content`; assert the owned conversation messages endpoint and request body.
- [ ] Mock and assert the authenticated Demo reply persistence request for the same conversation and user message.
- [ ] Run `pnpm exec vitest run tests/service-ai.test.ts`; report the baseline failure evidence and final output.
