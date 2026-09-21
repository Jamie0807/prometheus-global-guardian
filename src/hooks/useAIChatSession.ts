/** 管理持久化 AI 对话、历史会话选择和流式交互。 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelAIStream,
  createAIRequestId,
  streamChatMessage,
  type ChatMessage,
  type DisasterContext,
} from "../services/ai/aiAssistantService";
import {
  createAIConversation,
  deleteAIConversation,
  getAIConversation,
  listAIConversations,
} from "../services/ai/conversationService";
import type { AIConversationSummary } from "../services/ai/conversationService";
import { generateMessageId } from "../utils/aiAssistant";

interface RetrySnapshot {
  conversationId: string;
  clientMessageId: string;
  userMessage: ChatMessage;
  context: DisasterContext | undefined;
  failedAssistantId?: string;
}

interface ActiveRequest {
  requestId: number;
  serverRequestId: string;
  assistantId: string;
  controller: AbortController;
  conversationId: string;
}

export interface AIChatSession {
  messages: readonly ChatMessage[];
  conversations: readonly AIConversationSummary[];
  currentConversationId?: string;
  input: string;
  errorText: string;
  reconnectingText: string;
  isStreaming: boolean;
  isLoadingConversations: boolean;
  canRetry: boolean;
  setInput: (value: string) => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  newConversation: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
  retry: () => Promise<void>;
  close: () => void;
}

const MAX_MESSAGE_CHARACTERS = 8_000;

export function useAIChatSession(
  isOpen: boolean,
  onClose: () => void,
  context: DisasterContext | undefined,
): AIChatSession {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [errorText, setErrorText] = useState("");
  const [reconnectingText, setReconnectingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [retrySnapshot, setRetrySnapshot] = useState<RetrySnapshot>();
  const activeRequestRef = useRef<ActiveRequest | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const selectionSequenceRef = useRef(0);

  const stop = useCallback(() => {
    const active = activeRequestRef.current;
    setReconnectingText("");
    if (!active) return;

    activeRequestRef.current = undefined;
    requestSequenceRef.current += 1;
    void cancelAIStream(active.serverRequestId).catch(() => undefined);
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

  const loadConversation = useCallback(async (id: string): Promise<void> => {
    const selection = ++selectionSequenceRef.current;
    const conversation = await getAIConversation(id);
    if (selection !== selectionSequenceRef.current) return;
    setCurrentConversationId(conversation.id);
    setMessages(conversation.messages);
    setErrorText("");
    setRetrySnapshot(undefined);
  }, []);

  const refreshConversations = useCallback(async (): Promise<AIConversationSummary[]> => {
    const current = await listAIConversations();
    setConversations(current);
    return current;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoadingConversations(true);
    void (async () => {
      try {
        const current = await listAIConversations();
        if (cancelled) return;
        setConversations(current);
        const latest = current[0];
        if (latest) {
          const conversation = await getAIConversation(latest.id);
          if (!cancelled) {
            setCurrentConversationId(conversation.id);
            setMessages(conversation.messages);
          }
        } else {
          setCurrentConversationId(undefined);
          setMessages([]);
        }
        setErrorText("");
        setRetrySnapshot(undefined);
      } catch {
        if (!cancelled) setErrorText("无法加载历史会话，请重试。");
      } finally {
        if (!cancelled) setIsLoadingConversations(false);
      }
    })();
    return () => {
      cancelled = true;
      selectionSequenceRef.current += 1;
    };
  }, [isOpen]);

  const start = useCallback(
    async (snapshot: RetrySnapshot, appendUserMessage: boolean): Promise<void> => {
      if (activeRequestRef.current) return;

      const requestId = ++requestSequenceRef.current;
      const serverRequestId = createAIRequestId();
      const controller = new AbortController();
      const assistantId = generateMessageId();
      const activeRequest: ActiveRequest = {
        requestId,
        serverRequestId,
        assistantId,
        controller,
        conversationId: snapshot.conversationId,
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
      setReconnectingText("");
      setRetrySnapshot(undefined);
      setMessages((current) => {
        const withoutFailedReply = snapshot.failedAssistantId
          ? current.filter((message) => message.id !== snapshot.failedAssistantId)
          : current;
        return appendUserMessage
          ? [...withoutFailedReply, snapshot.userMessage]
          : withoutFailedReply;
      });
      setIsStreaming(true);

      const isCurrentRequest = (): boolean => activeRequestRef.current?.requestId === requestId;
      const outcome = await streamChatMessage(
        {
          conversationId: snapshot.conversationId,
          clientMessageId: snapshot.clientMessageId,
          content: snapshot.userMessage.content,
        },
        snapshot.context,
        {
          signal: controller.signal,
          requestId: serverRequestId,
          onReconnect: (attempt) => {
            if (isCurrentRequest()) {
              setReconnectingText(`连接中断，正在自动恢复（第 ${attempt}/3 次）……`);
            }
          },
          onReconnected: () => {
            if (isCurrentRequest()) setReconnectingText("");
          },
          onChunk: (chunk) => {
            if (!isCurrentRequest() || !chunk.trim()) return;
            setMessages((current) => {
              const exists = current.some((message) => message.id === assistantId);
              return exists
                ? current.map((message) =>
                    message.id === assistantId
                      ? { ...message, content: message.content + chunk }
                      : message,
                  )
                : [...current, { ...assistantMessage, content: chunk }];
            });
          },
        },
      );

      if (!isCurrentRequest()) return;

      if (outcome.kind === "completed") {
        setReconnectingText("");
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, isStreaming: false, isComplete: true }
              : message,
          ),
        );
        void refreshConversations().catch(() => undefined);
      } else if (outcome.kind === "cancelled") {
        setReconnectingText("");
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, isStreaming: false, isCancelled: true }
              : message,
          ),
        );
      } else {
        setReconnectingText("");
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, isStreaming: false } : message,
          ),
        );
        setErrorText(outcome.message);
        setRetrySnapshot({ ...snapshot, failedAssistantId: assistantId });
      }

      if (isCurrentRequest()) {
        activeRequestRef.current = undefined;
        setIsStreaming(false);
      }
    },
    [refreshConversations],
  );

  const send = useCallback(
    async (text: string): Promise<void> => {
      const content = text.trim();
      if (!content || activeRequestRef.current) return;
      if (content.length > MAX_MESSAGE_CHARACTERS) {
        setErrorText(`单条消息不能超过 ${MAX_MESSAGE_CHARACTERS} 个字符。`);
        return;
      }

      setInput("");
      setErrorText("");
      try {
        let conversationId = currentConversationId;
        if (!conversationId) {
          const conversation = await createAIConversation();
          conversationId = conversation.id;
          setCurrentConversationId(conversation.id);
          setConversations((current) => [conversation, ...current]);
        }
        const clientMessageId = generateMessageId();
        const userMessage: ChatMessage = {
          id: clientMessageId,
          role: "user",
          content,
          timestamp: new Date().toISOString(),
          isComplete: true,
        };
        await start({ conversationId, clientMessageId, userMessage, context }, true);
      } catch {
        setInput(content);
        setErrorText("无法创建会话，请稍后重试。");
      }
    },
    [context, currentConversationId, start],
  );

  const retry = useCallback(async (): Promise<void> => {
    if (!retrySnapshot || activeRequestRef.current) return;
    await start(retrySnapshot, false);
  }, [retrySnapshot, start]);

  const newConversation = useCallback(async (): Promise<void> => {
    stop();
    setMessages([]);
    setInput("");
    setErrorText("");
    setRetrySnapshot(undefined);
    try {
      const conversation = await createAIConversation();
      setConversations((current) => [conversation, ...current]);
      setCurrentConversationId(conversation.id);
    } catch {
      setCurrentConversationId(undefined);
      setErrorText("无法创建新会话，请稍后重试。");
    }
  }, [stop]);

  const selectConversation = useCallback(
    async (id: string): Promise<void> => {
      if (id === currentConversationId || isStreaming) return;
      stop();
      setIsLoadingConversations(true);
      try {
        await loadConversation(id);
      } catch {
        setErrorText("无法加载所选会话。");
      } finally {
        setIsLoadingConversations(false);
      }
    },
    [currentConversationId, isStreaming, loadConversation, stop],
  );

  const removeConversation = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteAIConversation(id);
        const remaining = conversations.filter((conversation) => conversation.id !== id);
        setConversations(remaining);
        if (currentConversationId === id) {
          const next = remaining[0];
          if (next) await loadConversation(next.id);
          else {
            setCurrentConversationId(undefined);
            setMessages([]);
          }
        }
      } catch {
        setErrorText("无法删除会话，请重试。");
      }
    },
    [conversations, currentConversationId, loadConversation],
  );

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
    conversations,
    currentConversationId,
    input,
    errorText,
    reconnectingText,
    isStreaming,
    isLoadingConversations,
    canRetry: Boolean(retrySnapshot) && !isStreaming,
    setInput,
    send,
    stop,
    newConversation,
    selectConversation,
    removeConversation,
    retry,
    close,
  };
}
