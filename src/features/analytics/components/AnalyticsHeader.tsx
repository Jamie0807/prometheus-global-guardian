import type { ServiceStatus } from "../types";

interface AnalyticsHeaderProps {
  serviceStatus: ServiceStatus;
  onClose: () => void;
}

export default function AnalyticsHeader({ serviceStatus, onClose }: AnalyticsHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
      }}
    >
      <h1 style={{ color: "#4CAF50", display: "flex", alignItems: "center", gap: "10px" }}>
        📊 数据分析
        <span
          style={{
            fontSize: "14px",
            padding: "4px 12px",
            borderRadius: "12px",
            backgroundColor: serviceStatus === "online" ? "#4CAF50" : "#f44336",
            color: "#fff",
          }}
        >
          {serviceStatus === "checking"
            ? "检测中..."
            : serviceStatus === "online"
              ? "就绪"
              : "离线"}
        </span>
      </h1>
      <button
        onClick={onClose}
        style={{
          background: "linear-gradient(135deg, #444 0%, #222 100%)",
          color: "#fff",
          padding: "12px 24px",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "500",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = "translateY(-2px)";
          event.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = "translateY(0)";
          event.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
        }}
      >
        ✕ 关闭
      </button>
    </div>
  );
}
