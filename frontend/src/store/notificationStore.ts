import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  status: "success" | "warning" | "info" | "error";
  read: boolean;
  category: "error" | "warning" | "activity" | "deployment" | "tenant_sync";
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  deleteNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [
        {
          id: "1",
          title: "Tenant sync started",
          message: "Syncing Azure resources from tenant",
          timestamp: "Just now",
          status: "info",
          read: false,
          category: "tenant_sync",
        },
        {
          id: "2",
          title: "VM provisioning started",
          message: "Provisioning vm-web-prod-001 in East US",
          timestamp: "2 min ago",
          status: "info",
          read: false,
          category: "deployment",
        },
        {
          id: "3",
          title: "Policy scan completed",
          message: "All 24 resources passed compliance checks",
          timestamp: "5 min ago",
          status: "success",
          read: true,
          category: "activity",
        },
        {
          id: "4",
          title: "Backend latency detected",
          message: "API response time exceeded threshold",
          timestamp: "12 min ago",
          status: "warning",
          read: true,
          category: "warning",
        },
        {
          id: "5",
          title: "Resource sync completed",
          message: "Successfully synced 156 resources",
          timestamp: "15 min ago",
          status: "success",
          read: true,
          category: "activity",
        },
        {
          id: "6",
          title: "Azure API disconnected",
          message: "Connection to Azure API was lost",
          timestamp: "1 hour ago",
          status: "error",
          read: true,
          category: "error",
        },
        {
          id: "7",
          title: "Infrastructure health warning",
          message: "High CPU usage detected on cluster-01",
          timestamp: "2 hours ago",
          status: "warning",
          read: true,
          category: "warning",
        },
        {
          id: "8",
          title: "New onboarding completed",
          message: "User john.doe@company.com completed onboarding",
          timestamp: "3 hours ago",
          status: "success",
          read: true,
          category: "activity",
        },
      ],

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: "Just now",
          read: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
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