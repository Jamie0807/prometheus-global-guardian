import React, { useCallback, useEffect, useState } from "react";
import {
  acceptAIMemorySuggestion,
  clearAIMemories,
  createAIMemory,
  deleteAIMemory,
  dismissAIMemorySuggestion,
  generateAIMemorySuggestions,
  getAIMemoryState,
  setAIMemoryEnabled,
  updateAIMemory,
} from "../services/ai/memoryService";
import type { AIMemoryState } from "../services/ai/memoryService";

interface AIMemoryManagerProps {
  open: boolean;
  conversationId?: string;
  onClose: () => void;
}

const EMPTY_STATE: AIMemoryState = { memoryEnabled: true, memories: [], suggestions: [] };

export default function AIMemoryManager({
  open,
  conversationId,
  onClose,
}: AIMemoryManagerProps): React.JSX.Element | null {
  const [state, setState] = useState<AIMemoryState>(EMPTY_STATE);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const next = await getAIMemoryState();
    setState(next);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    void getAIMemoryState()
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setError("无法加载记忆设置。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const perform = async (operation: () => Promise<unknown>) => {
    setWorking(true);
    setError("");
    try {
      await operation();
      await refresh();
    } catch {
      setError("操作失败，请稍后重试。");
    } finally {
      setWorking(false);
    }
  };

  if (!open) return null;

  return (
    <section className="ai-memory-panel" aria-label="长期记忆管理">
      <header className="ai-memory-panel-header">
        <div>
          <strong>长期记忆</strong>
          <span>每条记忆均由你确认</span>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭长期记忆">
          ×
        </button>
      </header>
      <div className="ai-memory-panel-body">
        {loading ? (
          <p>正在加载…</p>
        ) : (
          <>
            <label className="ai-memory-toggle">
              <input
                type="checkbox"
                checked={state.memoryEnabled}
                disabled={working}
                onChange={(event) => void perform(() => setAIMemoryEnabled(event.target.checked))}
              />
              在后续 AI 对话中使用已确认记忆
            </label>
            <div className="ai-memory-section-heading">
              <h3>已保存记忆</h3>
              {state.memories.length > 0 && (
                <button
                  type="button"
                  disabled={working}
                  onClick={() => {
                    if (window.confirm("清空全部长期记忆？")) void perform(clearAIMemories);
                  }}
                >
                  清空
                </button>
              )}
            </div>
            <form
              className="ai-memory-add"
              onSubmit={(event) => {
                event.preventDefault();
                const content = draft.trim();
                if (!content) return;
                void perform(async () => {
                  await createAIMemory(content);
                  setDraft("");
                });
              }}
            >
              <input
                value={draft}
                maxLength={2000}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="添加一条你希望 AI 记住的内容"
              />
              <button type="submit" disabled={working || !draft.trim()}>
                添加
              </button>
            </form>
            <ul className="ai-memory-list">
              {state.memories.map((memory) => (
                <li key={memory.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={memory.enabled}
                      disabled={working}
                      onChange={(event) =>
                        void perform(() =>
                          updateAIMemory(memory.id, { enabled: event.target.checked }),
                        )
                      }
                    />
                    <span>{memory.content}</span>
                  </label>
                  <div>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => {
                        const content = window.prompt("编辑这条记忆", memory.content);
                        if (content !== null && content.trim())
                          void perform(() => updateAIMemory(memory.id, { content }));
                      }}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => void perform(() => deleteAIMemory(memory.id))}
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
              {state.memories.length === 0 && <li className="ai-memory-empty">还没有保存记忆。</li>}
            </ul>
            <div className="ai-memory-section-heading">
              <h3>待确认建议</h3>
              <button
                type="button"
                disabled={working || !conversationId}
                onClick={() => {
                  if (!conversationId) return;
                  void perform(async () => {
                    await generateAIMemorySuggestions(conversationId);
                  });
                }}
              >
                从当前对话生成
              </button>
            </div>
            {state.suggestions
              .filter((suggestion) => suggestion.status === "PENDING")
              .map((suggestion) => (
                <article className="ai-memory-suggestion" key={suggestion.id}>
                  <p>{suggestion.content}</p>
                  {suggestion.reason && <small>{suggestion.reason}</small>}
                  <div>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => {
                        const content = window.prompt(
                          "确认记忆内容，可在保存前修改",
                          suggestion.content,
                        );
                        if (content !== null && content.trim())
                          void perform(() => acceptAIMemorySuggestion(suggestion.id, content));
                      }}
                    >
                      确认保存
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => void perform(() => dismissAIMemorySuggestion(suggestion.id))}
                    >
                      忽略
                    </button>
                  </div>
                </article>
              ))}
            {state.suggestions.every((suggestion) => suggestion.status !== "PENDING") && (
              <p className="ai-memory-empty">没有待确认建议。</p>
            )}
          </>
        )}
        {error && (
          <p className="ai-memory-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
