/**
 * 定义分析页面的共享样式常量。
 */
import type { CSSProperties } from "react";

export const STYLES = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "var(--analytics-page-bg)",
    backdropFilter: "blur(10px)",
    zIndex: 1000,
    overflow: "auto",
    padding: "20px",
  },
  card: {
    background: "var(--analytics-surface)",
    padding: "30px",
    borderRadius: "16px",
    marginBottom: "30px",
    border: "1px solid var(--analytics-border)",
    boxShadow: "0 16px 40px rgba(0, 5, 18, 0.42), inset 0 1px 0 rgba(224, 242, 254, 0.08)",
    transition: "all 0.3s ease",
  },
  button: {
    background: "var(--analytics-surface-raised)",
    color: "var(--analytics-accent)",
    padding: "12px 24px",
    border: "1px solid var(--analytics-border)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    boxShadow: "0 4px 12px var(--analytics-accent-glow)",
    transition: "all 0.3s ease",
  },
} satisfies Record<"container" | "card" | "button", CSSProperties>;
