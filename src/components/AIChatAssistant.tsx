/**
 * AIChatAssistant — AI 灾害分析助手面板
 *
 * 核心特性（参考 ai-flow 架构）：
 * - 流式 LLM 响应，逐字打印动画
 * - 灾害实时上下文自动注入
 * - 预设快捷分析工作流（Quick Prompts）
 * - 多轮对话历史管理
 * - Demo 模式降级（无 API Key 时）
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import DOMPurify from "dompurify";
import {
  streamChatMessage,
  type ChatMessage,
  type DisasterContext,
} from "../services/ai/aiAssistantService";
import { generateMessageId, formatTime, QUICK_PROMPTS } from "../utils/aiAssistant";
import type { Hazard } from "../types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AIChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  hazards: Hazard[];
}

// ─── 辅助组件：消息气泡 ───────────────────────────────────────────────────────

interface BubbleProps {
  msg: ChatMessage;
}

const MessageBubble: React.FC<BubbleProps> = ({ msg }) => {
  const isUser = msg.role === "user";

  // 简单 Markdown 渲染：粗体、标题、列表、表格行
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // 标题 **text**
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

      if (line.startsWith("### "))
        return (
          <h4
            key={i}
            className="ai-md-h4"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(boldLine.replace(/^### /, "")) }}
          />
        );
      if (line.startsWith("## "))
        return (
          <h3
            key={i}
            className="ai-md-h3"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(boldLine.replace(/^## /, "")) }}
          />
        );
      if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**"))
        return (
          <p
            key={i}
            className="ai-md-bold-line"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(boldLine) }}
          />
        );
      if (line.startsWith("- ") || line.startsWith("• "))
        return (
          <li
            key={i}
            className="ai-md-li"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(boldLine.replace(/^[-•] /, "")) }}
          />
        );
      if (line.match(/^\d+\. /))
        return (
          <li
            key={i}
            className="ai-md-li ai-md-ol"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(boldLine.replace(/^\d+\. /, "")),
            }}
          />
        );
      if (line.startsWith("|") && line.endsWith("|"))
        return (
          <div
            key={i}
            className="ai-md-table-row"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(boldLine) }}
          />
        );
      if (line === "---") return <hr key={i} className="ai-md-hr" />;
      if (line.trim() === "") return <div key={i} className="ai-md-spacer" />;
      return (
        <p
          key={i}
          className="ai-md-p"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(boldLine) }}
        />
      );
    });
  };

  return (
    <div className={`ai-bubble-wrap ${isUser ? "ai-bubble-user" : "ai-bubble-ai"}`}>
      {/* 头像 */}
      <div className={`ai-avatar ${isUser ? "ai-avatar-user" : "ai-avatar-ai"}`}>
        {isUser ? "👤" : "🤖"}
      </div>

      <div className="ai-bubble-inner">
        <div className={`ai-bubble ${isUser ? "ai-bubble-user-body" : "ai-bubble-ai-body"}`}>
          {isUser ? (
            <p className="ai-md-p">{msg.content}</p>
          ) : (
            <div className="ai-markdown">
              {renderMarkdown(msg.content)}
              {msg.isStreaming && <span className="ai-cursor">▌</span>}
            </div>
          )}
        </div>
        <span className="ai-ts">{formatTime(msg.timestamp)}</span>
      </div>
    </div>
  );
};

// ─── 主组件 ───────────────────────────────────────────────────────────────────

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ isOpen, onClose, hazards }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [contextEnabled, setContextEnabled] = useState(true);
  const [errorText, setErrorText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingIdRef = useRef<string | null>(null);

  // 构建灾害上下文
  const disasterContext = useMemo<DisasterContext>(() => {
    const byType: Record<string, number> = {};
    hazards.forEach((h) => {
      const t = h.type || "OTHER";
      byType[t] = (byType[t] || 0) + 1;
    });
    return {
      total: hazards.length,
      byType,
      recent: hazards.slice(0, 8).map((h) => ({
        title: h.title,
        type: h.type,
        severity: h.severity,
        timestamp: h.timestamp,
        magnitude: h.magnitude,
      })),
    };
  }, [hazards]);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 面板打开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ─── 发送消息核心逻辑 ───────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setErrorText("");
      setShowQuickPrompts(false);

      const userMsg: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      const assistantId = generateMessageId();
      streamingIdRef.current = assistantId;

      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      // 取历史消息（不含当前流式助手消息，不含 system 消息）
      const history = [...messages, userMsg].filter((m) => m.role !== "system");

      await streamChatMessage(
        history,
        contextEnabled ? disasterContext : undefined,
        // onChunk: 追加字符到流式消息
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          );
        },
        // onDone: 结束流式状态
        () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
          );
          setIsStreaming(false);
          streamingIdRef.current = null;
        },
        // onError
        (err) => {
          setErrorText(err);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setIsStreaming(false);
          streamingIdRef.current = null;
        },
      );
    },
    [messages, isStreaming, contextEnabled, disasterContext],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowQuickPrompts(true);
    setErrorText("");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层（半透明） */}
      <div className="ai-overlay" onClick={onClose} />

      {/* 面板主体 */}
      <div className="ai-panel">
        {/* ── 头部 ── */}
        <div className="ai-header">
          <div className="ai-header-title">
            <span className="ai-logo">🤖</span>
            <div>
              <h2>AI 灾害分析助手</h2>
              <p className="ai-subtitle">
                Powered by LLM ·{" "}
                {hazards.length > 0 ? `监控 ${hazards.length} 条事件` : "加载数据中..."}
              </p>
            </div>
          </div>
          <div className="ai-header-actions">
            {/* 上下文开关 */}
            <button
              className={`ai-ctx-btn ${contextEnabled ? "active" : ""}`}
              onClick={() => setContextEnabled((v) => !v)}
              title={contextEnabled ? "已注入灾害实时上下文" : "点击注入实时上下文"}
            >
              {contextEnabled ? "📡 上下文已开" : "📡 上下文已关"}
            </button>

            {/* 清空 */}
            {messages.length > 0 && (
              <button className="ai-clear-btn" onClick={clearChat} title="清空对话">
                🗑️
              </button>
            )}

            {/* 关闭 */}
            <button className="ai-close-btn" onClick={onClose}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ── 消息区域 ── */}
        <div className="ai-messages">
          {messages.length === 0 && (
            <div className="ai-welcome">
              <div className="ai-welcome-icon">🛰️</div>
              <h3>Prometheus AI 灾害分析助手</h3>
              <p>基于大语言模型，实时分析全球灾害态势，提供专业风险研判与应急建议。</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* 错误提示 */}
          {errorText && (
            <div className="ai-error">
              <span>⚠️ {errorText}</span>
              <button onClick={() => setErrorText("")}>✕</button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 快捷提问（首次展示） ── */}
        {showQuickPrompts && (
          <div className="ai-quick-prompts">
            <p className="ai-quick-label">💡 快捷分析</p>
            <div className="ai-quick-grid">
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  className="ai-quick-btn"
                  onClick={() => sendMessage(p.text)}
                  disabled={isStreaming}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 输入区域 ── */}
        <form className="ai-input-area" onSubmit={handleSubmit}>
          <div className="ai-input-wrap">
            <textarea
              ref={inputRef}
              className="ai-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入灾害分析问题... (Enter 发送，Shift+Enter 换行)"
              rows={2}
              disabled={isStreaming}
            />
            <button
              type="submit"
              className={`ai-send-btn ${isStreaming ? "loading" : ""}`}
              disabled={!input.trim() || isStreaming}
              title="发送"
            >
              {isStreaming ? (
                <span className="ai-sending-dots">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
          <p className="ai-hint">
            {isStreaming ? "🔄 AI 正在生成分析结果..." : "Enter 发送 · Shift+Enter 换行 · ESC 关闭"}
          </p>
        </form>
      </div>
    </>
  );
};

export default AIChatAssistant;
