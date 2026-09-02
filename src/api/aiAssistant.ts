/**
 * AI 助手兼容入口。
 * 新代码应分别从 Service 和 utils 引入，保留此入口用于兼容旧调用方。
 */
export {
  streamChatMessage,
  type ChatMessage,
  type ChatRole,
  type DisasterContext,
} from "../services/ai/aiAssistantService";
export { generateMessageId, formatTime, QUICK_PROMPTS } from "../utils/aiAssistant";
