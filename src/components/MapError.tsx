import React from "react";

interface MapErrorProps {
  error: string;
}

const MapError: React.FC<MapErrorProps> = ({ error }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(31, 41, 55, 0.95)",
        border: "2px solid #ef4444",
        borderRadius: "12px",
        padding: "32px",
        maxWidth: "600px",
        zIndex: 1000,
        color: "white",
        textAlign: "center",
      }}
    >
      <svg
        width="64"
        height="64"
        fill="none"
        stroke="#ef4444"
        viewBox="0 0 24 24"
        style={{ margin: "0 auto 16px" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "#ef4444" }}>地图配置错误</h2>

      <p style={{ marginBottom: "24px", color: "#d1d5db", lineHeight: "1.6" }}>{error}</p>

      <div
        style={{
          background: "rgba(55, 65, 81, 0.5)",
          borderRadius: "8px",
          padding: "16px",
          textAlign: "left",
          marginBottom: "24px",
        }}
      >
        <h3 style={{ fontSize: "1rem", marginBottom: "12px", color: "#60a5fa" }}>快速修复</h3>
        <ol style={{ paddingLeft: "20px", color: "#d1d5db", lineHeight: "1.8" }}>
          <li>
            访问{" "}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#60a5fa" }}
            >
              Mapbox 访问令牌
            </a>
          </li>
          <li>创建或复制访问令牌</li>
          <li>
            更新{" "}
            <code style={{ background: "#1f2937", padding: "2px 6px", borderRadius: "4px" }}>
              .env
            </code>{" "}
            文件：
          </li>
        </ol>
        <pre
          style={{
            background: "#1f2937",
            padding: "12px",
            borderRadius: "6px",
            marginTop: "8px",
            overflow: "auto",
            fontSize: "0.875rem",
          }}
        >
          VITE_MAPBOX_TOKEN=pk.your_token_here
        </pre>
        <li style={{ marginTop: "8px", color: "#d1d5db" }}>
          重启开发服务器：
          <code style={{ background: "#1f2937", padding: "2px 6px", borderRadius: "4px" }}>
            npm run dev
          </code>
        </li>
      </div>

      <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>应用会继续从公开数据源加载灾害数据。</p>
    </div>
  );
};

export default MapError;
