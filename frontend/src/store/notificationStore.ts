import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationSource = "deployment" | "assessment" | "policy_violation" | "servicenow_ticket" | "migration" | "system_alert";
export type NotificationSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  status: "success" | "warning" | "info" | "error";
  read: boolean;
  category: "error" | "warning" | "activity" | "deployment" | "tenant_sync";
  source: NotificationSource;
  severity: NotificationSeverity;
  playSound?: boolean;
}

function playNotificationSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

type AddNotificationInput = Omit<Notification, 'id' | 'timestamp' | 'read' | 'source' | 'severity'> & { source?: NotificationSource; severity?: NotificationSeverity; playSound?: boolean };

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: AddNotificationInput) => void;
  deleteNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notification) => {
        const newNotification: Notification = {
          id: Date.now().toString(),
          timestamp: "Just now",
          read: false,
          title: notification.title,
          message: notification.message,
          status: notification.status,
          category: notification.category,
          source: notification.source || "system_alert",
          severity: notification.severity || "info",
          playSound: notification.playSound,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
        const shouldPlay = notification.playSound || notification.status === "success" || notification.category === "deployment";
        if (shouldPlay) {
          playNotificationSound();
        }
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'infralift-notifications-storage',
    }
  )
);