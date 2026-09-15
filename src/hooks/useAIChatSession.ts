import { useCallback, useEffect, useRef, useState } from "react";
import {
  streamChatMessage,
  type ChatMessage,
  type DisasterContext,
} from "../services/ai/aiAssistantService";
import { generateMessageId } from "../utils/aiAssistant";

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARACTERS = 8_000;
const MAX_REQUEST_BYTES = 64 * 1024;

interface RetrySnapshot {
  history: ChatMessage[];
  userMessage: ChatMessage;
  context: DisasterContext | undefined;
}

interface ActiveRequest {
  requestId: number;
  assistantId: string;
  controller: AbortController;
  assistantCreated: boolean;
}

export interface AIChatSession {
  messages: readonly ChatMessage[];
  input: string;
  errorText: string;
  isStreaming: boolean;
  canRetry: boolean;
  setInput: (value: string) => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  clear: () => void;
  retry: () => Promise<void>;
  close: () => void;
}

function requestBytes(
  messages: readonly ChatMessage[],
  context: DisasterContext | undefined,
): number {
  return new TextEncoder().encode(JSON.stringify({ messages, disasterContext: context ?? null }))
    .byteLength;
}

function completedConversation(messages: readonly ChatMessage[]): ChatMessage[] {
  const history: ChatMessage[] = [];
  for (let index = 0; index < messages.length - 1; index += 1) {
    const user = messages[index];
    const assistant = messages[index + 1];
    if (user.role === "user" && assistant.role === "assistant" && assistant.isComplete) {
      history.push(user, assistant);
      index += 1;
    }
  }
  return history;
}

function prepareHistory(
  messages: readonly ChatMessage[],
  userMessage: ChatMessage,
  context: DisasterContext | undefined,
): ChatMessage[] | undefined {
  const history = [...completedConversation(messages), userMessage];
  while (history.length > MAX_MESSAGES || requestBytes(history, context) > MAX_REQUEST_BYTES) {
    if (history.length <= 1) return undefined;
    history.splice(0, 2);
  }
  return history;
}

export function useAIChatSession(
  isOpen: boolean,
  onClose: () => void,
  context: DisasterContext | undefined,
): AIChatSession {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [retrySnapshot, setRetrySnapshot] = useState<RetrySnapshot>();
  const activeRequestRef = useRef<ActiveRequest | undefined>(undefined);
  const requestSequenceRef = useRef(0);

  const stop = useCallback(() => {
    const active = activeRequestRef.current;
    if (!active) return;

    activeRequestRef.current = undefined;
    requestSequenceRef.current += 1;
    active.controller.abort();
    setMessages((current) =>
      current.map((message) =>
        message.id === active.assistantId
          ? { ...message, isStreaming: false, isCancelled: true }
          : message,
      ),
    );
    setIsStreaming(false);
  }, []);

  const start = useCallback(
    async (snapshot: RetrySnapshot, appendUserMessage: boolean): Promise<void> => {
      if (activeRequestRef.current) return;

      const requestId = ++requestSequenceRef.current;
      const controller = new AbortController();
      const assistantId = generateMessageId();
      const activeRequest: ActiveRequest = {
        requestId,
        assistantId,
        controller,
        assistantCreated: false,
      };
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      activeRequestRef.current = activeRequest;
      setErrorText("");
      setRetrySnapshot(undefined);
      setMessages((current) => (appendUserMessage ? [...current, snapshot.userMessage] : current));
      setIsStreaming(true);

      const isCurrentRequest = (): boolean => activeRequestRef.current?.requestId === requestId;
      const outcome = await streamChatMessage(snapshot.history, snapshot.context, {
        signal: controller.signal,
        onChunk: (chunk) => {
          if (!isCurrentRequest()) return;
          if (!chunk.trim()) return;
          if (!activeRequest.assistantCreated) {
            activeRequest.assistantCreated = true;
            setMessages((current) => [...current, { ...assistantMessage, content: chunk }]);
            return;
          }
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + chunk }
                : message,
            ),
          );
        },
      });

      if (!isCurrentRequest()) return;

      if (outcome.kind === "completed") {
        if (activeRequest.assistantCreated) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, isStreaming: false, isComplete: true }
                : message,
            ),
          );
        }
      } else if (outcome.kind === "cancelled") {
        if (activeRequest.assistantCreated) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, isStreaming: false, isCancelled: true }
                : message,
            ),
          );
        }
      } else {
        if (activeRequest.assistantCreated) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, isStreaming: false } : message,
            ),
          );
        }
        setErrorText(outcome.message);
        setRetrySnapshot(snapshot);
      }

      if (isCurrentRequest()) {
        activeRequestRef.current = undefined;
        setIsStreaming(false);
      }
    },
    [],
  );

  const send = useCallback(
    async (text: string): Promise<void> => {
      const content = text.trim();
      if (!content || activeRequestRef.current) return;
      if (content.length > MAX_MESSAGE_CHARACTERS) {
        setErrorText(`单条消息不能超过 ${MAX_MESSAGE_CHARACTERS} 个字符。`);
        return;
      }

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
        isComplete: true,
      };
      const history = prepareHistory(messages, userMessage, context);
      if (!history) {
        setErrorText("请求内容超过 64 KiB，请缩短消息后重试。");
        return;
      }

      setInput("");
      await start({ history, userMessage, context }, true);
    },
    [context, messages, start],
  );

  const retry = useCallback(async (): Promise<void> => {
    if (!retrySnapshot || activeRequestRef.current) return;
    await start(retrySnapshot, false);
  }, [retrySnapshot, start]);

  const clear = useCallback(() => {
    stop();
    setMessages([]);
    setInput("");
    setErrorText("");
    setRetrySnapshot(undefined);
  }, [stop]);

  const close = useCallback(() => {
    stop();
    onClose();
  }, [onClose, stop]);

  useEffect(() => {
    if (!isOpen) stop();
  }, [isOpen, stop]);

  useEffect(() => stop, [stop]);

  return {
    messages,
    input,
    errorText,
    isStreaming,
    canRetry: Boolean(retrySnapshot) && !isStreaming,
    setInput,
    send,
    stop,
    clear,
    retry,
    close,
  };
}
