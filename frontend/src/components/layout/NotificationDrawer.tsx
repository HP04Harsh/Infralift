"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCircle, AlertCircle, Info, Trash2, Server, Shield, Activity, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notificationStore";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    deleteNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    getUnreadCount,
  } = useNotificationStore();

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const unreadCount = getUnreadCount();

  const groupedNotifications = {
    error: notifications.filter(n => n.category === 'error'),
    warning: notifications.filter(n => n.category === 'warning'),
    deployment: notifications.filter(n => n.category === 'deployment'),
    tenant_sync: notifications.filter(n => n.category === 'tenant_sync'),
    activity: notifications.filter(n => n.category === 'activity'),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "deployment":
        return <Server className="h-4 w-4 text-blue-500" />;
      case "tenant_sync":
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      case "activity":
        return <Activity className="h-4 w-4 text-emerald-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "error":
        return "Errors";
      case "warning":
        return "Warnings";
      case "deployment":
        return "Deployments";
      case "tenant_sync":
        return "Tenant Sync";
      case "activity":
        return "Activities";
      default:
        return "Other";
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      warning: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      error: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
      info: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    };

    const labels = {
      success: "Completed",
      warning: "Warning",
      error: "Error",
      info: "Info",
    };

    return (
      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", styles[status as keyof typeof styles])}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const NotificationItem = ({ notification }: { notification: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
      onClick={() => markAsRead(notification.id)}
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-colors",
        !notification.read && "bg-blue-50/50 dark:bg-blue-900/10",
        "hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon(notification.status)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={cn(
              "text-sm font-medium truncate",
              !notification.read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-slate-300"
            )}>
              {notification.title}
            </h3>
            {!notification.read && (
              <span className="w-2 h-2 bg-azure-500 rounded-full flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {notification.timestamp}
            </span>
            <div className="flex items-center gap-2">
              {getStatusBadge(notification.status)}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="h-5 w-5 text-gray-700 dark:text-slate-300" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-azure-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs text-gray-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                  >
                    Clear all
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-slate-400">
                  <Bell className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {Object.entries(groupedNotifications).map(([category, notifs]) => 
                    notifs.length > 0 && (
                      <div key={category} className="mb-4">
                        <div className="flex items-center gap-2 px-2 py-1 mb-2">
                          {getCategoryIcon(category)}
                          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                            {getCategoryLabel(category)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            ({notifs.length})
                          </span>
                        </div>
                        {notifs.map((notification) => (
                          <NotificationItem key={notification.id} notification={notification} />
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200/50 dark:border-slate-800/50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              >
                View all notifications
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}