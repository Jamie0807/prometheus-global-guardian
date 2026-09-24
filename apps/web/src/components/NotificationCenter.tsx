/**
 * 提供应用通知中心组件。
 */
import React, { useState, useEffect } from "react";
import { notificationManager } from "../utils/notifications";
import type { NotificationItem } from "../utils/notifications";

type NotificationIconName = "success" | "error" | "warning" | "info";

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

  const getIconAndColor = (
    type: NotificationItem["type"],
  ): { icon: NotificationIconName; color: string } => {
    switch (type) {
      case "success":
        return { icon: "success", color: "var(--notification-normal)" };
      case "error":
        return { icon: "error", color: "var(--notification-danger)" };
      case "warning":
        return { icon: "warning", color: "var(--notification-warning)" };
      default:
        return { icon: "info", color: "var(--notification-info)" };
    }
  };

  const renderStatusIcon = (icon: NotificationIconName) => {
    const paths = {
      success: <path d="m5 12 4 4L19 6" />,
      error: <path d="m18 6-12 12M6 6l12 12" />,
      warning: (
        <>
          <path d="M10.3 3.9 2.5 17.4A1.8 1.8 0 0 0 4.1 20h15.8a1.8 1.8 0 0 0 1.6-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4m0 3h.01" />
        </>
      ),
      info: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5m0-8h.01" />
        </>
      ),
    };

    return (
      <svg
        aria-hidden="true"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[icon]}
      </svg>
    );
  };

  return (
    <div className="notification-center">
      {/* 通知按钮 */}
      <button
        type="button"
        className="header-action notification-trigger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg
          className="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        <span>通知</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
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
            className="notification-panel"
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "10px",
              width: "400px",
              maxHeight: "500px",
              backgroundColor: "var(--notification-surface)",
              border: "1px solid var(--notification-border)",
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
                borderBottom: "1px solid var(--notification-border-soft)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 className="notification-panel-title">通知中心</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                {unreadCount > 0 && (
                  <button
                    className="notification-panel-action notification-panel-action--primary"
                    onClick={() => notificationManager.markAllAsRead()}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "var(--notification-accent)",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    全部已读
                  </button>
                )}
                <button
                  className="notification-panel-action notification-panel-action--clear"
                  onClick={() => notificationManager.clear()}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "var(--notification-muted)",
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
                    color: "var(--notification-muted)",
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
                      className={`notification-panel-item${notification.read ? "" : " is-unread"}`}
                      style={{
                        padding: "15px 20px",
                        borderBottom: "1px solid var(--notification-border-soft)",
                        backgroundColor: notification.read
                          ? "transparent"
                          : "rgba(56, 189, 248, 0.08)",
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
                            backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
                            color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: "14px",
                          }}
                        >
                          {renderStatusIcon(icon)}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              color: "var(--notification-text)",
                              fontWeight: notification.read ? "normal" : "bold",
                              marginBottom: "4px",
                            }}
                          >
                            {notification.title}
                          </div>
                          <div
                            style={{
                              color: "var(--notification-muted)",
                              fontSize: "13px",
                              marginBottom: "4px",
                            }}
                          >
                            {notification.message}
                          </div>
                          <div
                            style={{ color: "var(--notification-muted-soft)", fontSize: "11px" }}
                          >
                            {notification.timestamp.toLocaleString("zh-CN")}
                          </div>
                        </div>
                        <button
                          className="notification-panel-remove"
                          aria-label="删除通知"
                          onClick={(e) => {
                            e.stopPropagation();
                            notificationManager.remove(notification.id);
                          }}
                          style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "var(--notification-muted-soft)",
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
