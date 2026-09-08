import type { CSSProperties } from "react";

export const STYLES = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(10,10,20,0.95) 100%)",
    backdropFilter: "blur(10px)",
    zIndex: 1000,
    overflow: "auto",
    padding: "20px",
  },
  card: {
    background: "linear-gradient(135deg, #1a1a1a 0%, #252525 100%)",
    padding: "30px",
    borderRadius: "16px",
    marginBottom: "30px",
    border: "1px solid rgba(76, 175, 80, 0.2)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
    transition: "all 0.3s ease",
  },
  button: {
    background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
    color: "#4CAF50",
    padding: "12px 24px",
    border: "1px solid #4CAF50",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    boxShadow: "0 4px 12px rgba(76, 175, 80, 0.2)",
    transition: "all 0.3s ease",
  },
} satisfies Record<"container" | "card" | "button", CSSProperties>;
