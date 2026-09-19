/**
 * 渲染聊天面板、快捷提示和当前会话。
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import DOMPurify from "dompurify";
import type { ChatMessage, DisasterContext } from "../services/ai/aiAssistantService";
import { formatTime, QUICK_PROMPTS } from "../utils/aiAssistant";
import { useAIChatSession } from "../hooks/useAIChatSession";
import { useMapState } from "../features/map/state/MapStateContext";
import { useUIState } from "../state/UIStateContext";

// ─── 辅助组件：消息气泡 ───────────────────────────────────────────────────────

interface BubbleProps {
  msg: ChatMessage;
}

const MessageBubble: React.FC<BubbleProps> = ({ msg }) => {
  const isUser = msg.role === "user";

  // 按行格式化粗体、二三级标题、列表和管道分隔行。
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // 标题 **文本**
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
        {msg.isCancelled && <span className="ai-ts">已停止</span>}
      </div>
    </div>
  );
};

// ─── 主组件 ───────────────────────────────────────────────────────────────────

const AIChatAssistant: React.FC = () => {
  const { hazards } = useMapState();
  const { activeModal, closeModal } = useUIState();
  const isOpen = activeModal === "ai";
  const [contextEnabled, setContextEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 将当前地图事件压缩为数量、类型和最多八条近期记录，作为可选请求上下文。
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
        sourceId: h.sourceId,
        layerId: h.layerId,
      })),
    };
  }, [hazards]);

  const {
    messages,
    input,
    errorText,
    reconnectingText,
    isStreaming,
    canRetry,
    setInput,
    send,
    stop,
    clear,
    retry,
    close,
  } = useAIChatSession(isOpen, closeModal, contextEnabled ? disasterContext : undefined);

  // 每次消息数组变化后滚动到最新消息。
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 面板打开后延迟聚焦，等待输入框挂载完成。
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // 仅面板打开时响应 Escape，并由 close 取消活跃请求。
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层（半透明） */}
      <div className="ai-overlay" onClick={close} />

      {/* 面板主体 */}
      <div className="ai-panel">
        {/* ── 头部 ── */}
        <div className="ai-header">
          <div className="ai-header-title">
            <span className="ai-logo">🤖</span>
            <div>
              <h2>AI 灾害分析助手</h2>
              <p className="ai-subtitle">
                由 LLM 提供支持 ·{" "}
                {hazards.length > 0 ? `监控 ${hazards.length} 条事件` : "正在加载数据……"}
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
              <button className="ai-clear-btn" onClick={clear} title="清空对话">
                🗑️
              </button>
            )}

            {isStreaming && (
              <button className="ai-clear-btn" onClick={stop} type="button">
                停止
              </button>
            )}

            {/* 关闭 */}
            <button className="ai-close-btn" onClick={close} aria-label="关闭 AI 助手">
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
              <h3>全球灾害监控平台 AI 灾害分析助手</h3>
              <p>基于大语言模型，实时分析全球灾害态势，提供专业风险研判与应急建议。</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* 错误提示 */}
          {reconnectingText && <div className="ai-error">🔄 {reconnectingText}</div>}
          {errorText && (
            <div className="ai-error">
              <span>⚠️ {errorText}</span>
              {canRetry && <button onClick={() => void retry()}>重试</button>}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 快捷提问（首次展示） ── */}
        {messages.length === 0 && (
          <div className="ai-quick-prompts">
            <p className="ai-quick-label">💡 快捷分析</p>
            <div className="ai-quick-grid">
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  className="ai-quick-btn"
                  onClick={() => void send(p.text)}
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
              placeholder="输入灾害分析问题……（按 Enter 发送，按 Shift+Enter 换行）"
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
            {isStreaming
              ? "🔄 AI 正在生成分析结果……"
              : "按 Enter 发送 · 按 Shift+Enter 换行 · 按 ESC 关闭"}
          </p>
        </form>
      </div>
    </>
  );
};

export default AIChatAssistant;
