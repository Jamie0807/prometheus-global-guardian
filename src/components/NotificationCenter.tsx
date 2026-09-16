/**
 * 提供应用通知中心组件。
 */
import React, { useState, useEffect } from "react";
import { notificationManager } from "../utils/notifications";
import type { NotificationItem } from "../utils/notifications";

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(setNotifications);
    return () => {
      unsubscribe();
    };
  }, []);

  const unreadCount = notificationManager.getUnreadCount();

  const getIconAndColor = (type: NotificationItem["type"]) => {
    switch (type) {
      case "success":
        return { icon: "✓", color: "#4CAF50" };
      case "error":
        return { icon: "✕", color: "#f44336" };
      case "warning":
        return { icon: "⚠", color: "#ff9800" };
      default:
        return { icon: "ℹ", color: "#2196F3" };
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* 通知按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          backgroundColor: "#2a2a2a",
          border: "1px solid #4CAF50",
          color: "#fff",
          padding: "10px 15px",
          borderRadius: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        🔔 通知
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              backgroundColor: "#f44336",
              color: "#fff",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: "bold",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 通知面板 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />

          {/* 通知列表 */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "10px",
              width: "400px",
              maxHeight: "500px",
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              zIndex: 1000,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* 头部 */}
            <div
              style={{
                padding: "15px 20px",
                borderBottom: "1px solid #333",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ color: "#4CAF50", margin: 0 }}>通知中心</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                {unreadCount > 0 && (
                  <button
                    onClick={() => notificationManager.markAllAsRead()}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#4CAF50",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    全部已读
                  </button>
                )}
                <button
                  onClick={() => notificationManager.clear()}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#f44336",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  清空
                </button>
              </div>
            </div>

            {/* 通知列表 */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#888",
                  }}
                >
                  暂无通知
                </div>
              ) : (
                notifications.map((notification) => {
                  const { icon, color } = getIconAndColor(notification.type);
                  return (
                    <div
                      key={notification.id}
                      style={{
                        padding: "15px 20px",
                        borderBottom: "1px solid #2a2a2a",
                        backgroundColor: notification.read ? "transparent" : "#2a2a2a",
                        cursor: "pointer",
                      }}
                      onClick={() => notificationManager.markAsRead(notification.id)}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: color,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: "14px",
                          }}
                        >
                          {icon}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              color: "#fff",
                              fontWeight: notification.read ? "normal" : "bold",
                              marginBottom: "4px",
                            }}
                          >
                            {notification.title}
                          </div>
                          <div
                            style={{
                              color: "#888",
                              fontSize: "13px",
                              marginBottom: "4px",
                            }}
                          >
                            {notification.message}
                          </div>
                          <div style={{ color: "#666", fontSize: "11px" }}>
                            {notification.timestamp.toLocaleString("zh-CN")}
                          </div>
                        </div>
                        <button
                          aria-label="删除通知"
                          onClick={(e) => {
                            e.stopPropagation();
                            notificationManager.remove(notification.id);
                          }}
                          style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#666",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: "0 5px",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
