"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotificationStore, Notification } from "@/store/notificationStore";
import { CheckCircle, AlertCircle, Info, AlertTriangle, Server, Shield, Activity, RefreshCw, Ticket, ArrowLeft, Trash2, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const sourceIcons: Record<string, React.ReactNode> = {
  deployment: <Server className="h-4 w-4 text-blue-500" />,
  assessment: <Activity className="h-4 w-4 text-emerald-500" />,
  policy_violation: <Shield className="h-4 w-4 text-red-500" />,
  servicenow_ticket: <Ticket className="h-4 w-4 text-purple-500" />,
  migration: <RefreshCw className="h-4 w-4 text-amber-500" />,
  system_alert: <AlertTriangle className="h-4 w-4 text-orange-500" />,
};

const sourceLabels: Record<string, string> = {
  deployment: "Deployment",
  assessment: "Assessment",
  policy_violation: "Policy Violation",
  servicenow_ticket: "ServiceNow Ticket",
  migration: "Migration",
  system_alert: "System Alert",
};

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  high: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  medium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  low: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  info: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

const statusStyles: Record<string, string> = {
  success: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotificationStore();
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const stored = localStorage.getItem('user_name');
    if (stored) setUserName(stored);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator userName={userName} />
        <main className="p-4 lg:p-5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Notifications</h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{notifications.length} total</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notifications.some(n => !n.read) && (
                  <Button variant="outline" size="sm" onClick={markAllAsRead} className="text-xs h-8">
                    <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                    Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearAll} className="text-xs h-8 text-red-500 hover:text-red-600 border-red-200 hover:border-red-300">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            <Card className="border border-gray-200 dark:border-slate-700">
              <CardContent className="p-0">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-slate-400">
                    <Info className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm font-medium">No notifications</p>
                    <p className="text-xs mt-1">Notifications from deployments, assessments, migrations, and other sources will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                          <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Timestamp</th>
                          <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Severity</th>
                          <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Source</th>
                          <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Details</th>
                          <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                          <th className="text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                        {notifications.map((notification: Notification, idx: number) => (
                          <motion.tr
                            key={notification.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            onClick={() => markAsRead(notification.id)}
                            className={cn(
                              "cursor-pointer transition-colors",
                              !notification.read ? "bg-blue-50/40 dark:bg-blue-900/10" : "hover:bg-gray-50 dark:hover:bg-slate-800/30"
                            )}
                          >
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400 whitespace-nowrap">
                              {notification.timestamp}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", severityStyles[notification.severity] || severityStyles.info)}>
                                {notification.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {sourceIcons[notification.source] || sourceIcons.system_alert}
                                <span className="text-xs text-gray-700 dark:text-slate-300">
                                  {sourceLabels[notification.source] || notification.source}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className={cn("text-sm", !notification.read ? "font-medium text-gray-900 dark:text-white" : "text-gray-700 dark:text-slate-300")}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{notification.message}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusStyles[notification.status])}>
                                {notification.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!notification.read && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                    className="p-1.5 text-gray-400 hover:text-azure-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                    title="Mark as read"
                                  >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
