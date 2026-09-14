/**
 * 通知系统
 */

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

class NotificationManager {
  private notifications: NotificationItem[] = [];
  private listeners: Set<(notifications: NotificationItem[]) => void> = new Set();

  /**
   * 添加通知
   */
  add(type: NotificationType, title: string, message: string): NotificationItem {
    const notification: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    };

    this.notifications.unshift(notification);

    // 最多保留50条通知
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this.notifyListeners();

    // 自动显示浏览器通知（如果允许）
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: message });
    }

    return notification;
  }

  /**
   * 标记为已读
   */
  markAsRead(id: string) {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  /**
   * 全部标记为已读
   */
  markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));
    this.notifyListeners();
  }

  /**
   * 删除通知
   */
  remove(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notifyListeners();
  }

  /**
   * 清空所有通知
   */
  clear() {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * 获取所有通知
   */
  getAll(): NotificationItem[] {
    return [...this.notifications];
  }

  /**
   * 获取未读数量
   */
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  /**
   * 订阅通知更新
   */
  subscribe(listener: (notifications: NotificationItem[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 请求浏览器通知权限
   */
  async requestPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }
}

// 单例
export const notificationManager = new NotificationManager();

// 便捷方法
export const notify = {
  info: (title: string, message: string) => notificationManager.add("info", title, message),
  success: (title: string, message: string) => notificationManager.add("success", title, message),
  warning: (title: string, message: string) => notificationManager.add("warning", title, message),
  error: (title: string, message: string) => notificationManager.add("error", title, message),
};
