"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { motion } from "framer-motion";
import { Server, AlertTriangle, DollarSign, Shield, Cloud, Activity, Play, FileText, BarChart3, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboardingStore";
import { PortalLoader } from "@/components/ui/PortalLoader";
import { useTenantDataStore } from "@/store/tenantDataStore";
import { useNotificationStore, Notification } from "@/store/notificationStore";
import { apiService } from "@/services/api";

export default function DashboardPage() {
  const router = useRouter();
  const { progress } = useOnboardingStore();
  const loading = useTenantDataStore((s) => s.loading);
  const syncing = useTenantDataStore((s) => s.syncing);
  const stats = useTenantDataStore((s) => s.stats);
  const security = useTenantDataStore((s) => s.security);
  const costs = useTenantDataStore((s) => s.costs);
  const lastSync = useTenantDataStore((s) => s.lastSync);
  const fetchAll = useTenantDataStore((s) => s.fetchAll);
  const notifications = useNotificationStore((s) => s.notifications);

  const [audits, setAudits] = useState<any[]>([]);
  const [activityEvents, setActivityEvents] = useState<any[]>([]);

  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$", INR: "₹", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$", BRL: "R$", AED: "د.إ", SGD: "S$", HKD: "HK$", KRW: "₩", CHF: "Fr",
  };
  const currencyCode = costs?.currency || "";
  const currencySymbol = currencyCode ? (CURRENCY_SYMBOLS[currencyCode] ?? currencyCode + " ") : "";

  const byType = stats?.by_type ?? {};
  const totalRgs = byType["Microsoft.Resources/resourceGroups"] ?? 0;
  const totalResources = stats?.total_resources ?? 0;
  const totalVms = byType["Microsoft.Compute/virtualMachines"] ?? 0;
  const hasData = stats != null && totalResources > 0;
  const syncFailed = lastSync != null && stats == null;

  useEffect(() => {
    if (progress < 100) {
      router.replace("/onboarding");
    }
  }, [progress, router]);

  useEffect(() => {
    if (progress >= 100 && loading) {
      fetchAll();
    }
  }, [progress, loading, fetchAll]);

  useEffect(() => {
    apiService.listAudits().then((res: any) => {
      if (res?.audits) setAudits(res.audits);
    }).catch(() => {});
    // Also fetch real activity events from the event bus
    apiService.getActivities().then((res: any) => {
      if (res?.events) setActivityEvents(res.events);
    }).catch(() => {});
  }, []);

  const syncEvent = useMemo(() => {
    if (syncing) return null;
    if (lastSync && stats) {
      return { title: "Sync Successful", status: "Completed" as const, timestamp: new Date(lastSync).toLocaleString() };
    }
    if (lastSync && !stats) {
      return { title: "Sync Failed", status: "Open" as const, timestamp: new Date(lastSync).toLocaleString() };
    }
    return null;
  }, [syncing, lastSync, stats]);

  const activities = useMemo(() => {
    const items: { title: string; status: "Completed" | "In Progress" | "Open" | "Resolved" | "Updated"; timestamp: string }[] = [];

    if (syncEvent) {
      items.push(syncEvent);
    }

    const safeActivityEvents = Array.isArray(activityEvents) ? activityEvents : [];
    safeActivityEvents.slice(0, 10).forEach((ev: any) => {
      const et = ev?.event_type || "";
      const map: Record<string, string> = {
        "deployment.succeeded": "Deployment succeeded",
        "deployment.failed": "Deployment failed",
        "sync.completed": "Sync completed",
        "sync.failed": "Sync failed",
        "assessment.completed": "Assessment completed",
        "ticket.created": "ServiceNow ticket created",
        "policy.remediated": "Policy remediated",
        "resource.modified": "Resource modified",
      };
      const label = map[et] || et;
      const status = (et.includes("failed") || et.includes("error")) ? "Open" : "Completed";
      const ts = ev?.timestamp ? new Date(ev.timestamp).toLocaleString() : "Just now";
      items.push({ title: label, status: status as any, timestamp: ts });
    });

    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    safeNotifications.slice(0, 10).forEach((n: Notification) => {
      if (/deployment/i.test(n.title)) return;
      const map: Record<string, "Completed" | "In Progress" | "Open" | "Resolved" | "Updated"> = {
        success: "Completed", warning: "Updated", error: "Open", info: "Resolved",
      };
      items.push({ title: n.title, status: map[n.status] || "Completed", timestamp: n.timestamp });
    });

    const safeAudits = Array.isArray(audits) ? audits : [];
    safeAudits.slice(0, 5).forEach((a: any) => {
      const ago = a.timestamp ? new Date(a.timestamp).toLocaleString() : "Just now";
      const label = a.deploymentStatus === "failed" ? "Deployment failed" : a.deploymentStatus === "completed" ? "Deployment completed" : a.agentType ? `${a.agentType} action` : "Activity recorded";
      items.push({ title: `${label}: ${a.deploymentId || a.auditId || ""}`, status: a.deploymentStatus === "failed" ? "Open" : "Completed", timestamp: ago });
    });

    items.sort((a, b) => {
      if (a.timestamp === "Just now") return -1;
      if (b.timestamp === "Just now") return 1;
      return b.timestamp.localeCompare(a.timestamp);
    });

    return items.slice(0, 15);
  }, [notifications, audits, syncEvent]);

  if (progress < 100 || loading) {
    return <PortalLoader />;
  }

  const metricCards = [
    {
      title: "Total Resources",
      value: String(totalResources),
      subtext: `${totalRgs} resource groups`,
      icon: <Cloud className="h-4 w-4 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
    },
    {
      title: "Virtual Machines",
      value: String(totalVms),
      subtext: `${byType["Microsoft.Network/virtualNetworks"] ?? 0} networks`,
      icon: <Server className="h-4 w-4 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
    },
    {
      title: "Active Risks",
      value: String(security?.total_alerts ?? 0),
      subtext: `${security?.by_severity?.high ?? 0} high, ${security?.by_severity?.medium ?? 0} medium`,
      variant: (security?.total_alerts ?? 0) > 0 ? "warning" as const : "default" as const,
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      iconBg: "bg-red-100 dark:bg-red-900/40",
    },
    {
      title: "Monthly Cost",
      value: currencySymbol ? `${currencySymbol}${(costs?.month_to_date ?? 0).toLocaleString()}` : "Currency unavailable",
      subtext: currencySymbol ? `Forecast: ${currencySymbol}${(costs?.forecast ?? 0).toLocaleString()}` : "",
      icon: <DollarSign className="h-4 w-4 text-green-600" />,
      iconBg: "bg-green-100 dark:bg-green-900/40",
    },
    {
      title: "Security Score",
      value: security?.secure_score_percentage != null ? `${Math.round(security.secure_score_percentage)}%` : "N/A",
      subtext: `${stats?.resource_summary?.sql_databases ?? 0} databases monitored`,
      variant: (security?.secure_score_percentage ?? 0) >= 70 ? "success" as const : "warning" as const,
      icon: <Shield className="h-4 w-4 text-indigo-600" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    },
  ];

  const quickActions = [
    { title: "Provision Resource", description: "Create new Azure resources", icon: <Play className="h-4 w-4 text-blue-500" />, iconBg: "bg-blue-50 dark:bg-blue-900/30", path: "/provisioning" },
    { title: "Check Compliance", description: "Validate policy compliance", icon: <Shield className="h-4 w-4 text-emerald-500" />, iconBg: "bg-emerald-50 dark:bg-emerald-900/30", path: "/compliance" },
    { title: "Optimize Costs", description: "Reduce infrastructure costs", icon: <DollarSign className="h-4 w-4 text-amber-500" />, iconBg: "bg-amber-50 dark:bg-amber-900/30", path: "/optimization" },
    { title: "Open ITSM Ticket", description: "Create support ticket", icon: <FileText className="h-4 w-4 text-purple-500" />, iconBg: "bg-purple-50 dark:bg-purple-900/30", path: "/itsm" },
    { title: "View Observability", description: "Monitor resource metrics", icon: <BarChart3 className="h-4 w-4 text-indigo-500" />, iconBg: "bg-indigo-50 dark:bg-indigo-900/30", path: "/observability" },
    { title: "Run Assessment", description: "Analyze infrastructure health", icon: <Activity className="h-4 w-4 text-rose-500" />, iconBg: "bg-rose-50 dark:bg-rose-900/30", path: "/assessment" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator />
        <main className="p-4 lg:p-5">
          <div className="max-w-6xl mx-auto">
            <DashboardHero />

            {/* Sync Status Banner */}
            {syncing && (
              <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Syncing tenant data...
              </div>
            )}
            {syncFailed && (
              <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                Sync Failed. No tenant data available.
              </div>
            )}

            {/* Overview */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {metricCards.map((card, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 * i }}>
                    <MetricCard {...card} />
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Quick Actions */}
              <div className="lg:col-span-2">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                  <Card className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {quickActions.map((action, i) => (
                          <motion.div key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => router.push(action.path)} className="cursor-pointer">
                            <QuickActionCard {...action} />
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Recent Activity */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                <Card className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-full">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</CardTitle>
                    {activities.length > 5 && (
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {activities.length} items
                      </span>
                    )}
                  </CardHeader>
                  <CardContent className="max-h-[340px] overflow-y-auto">
                    <div className="space-y-2">
                      {activities.length > 0 ? (
                        activities.map((activity, i) => (
                          <ActivityItem key={i} title={activity.title} status={activity.status} timestamp={activity.timestamp} />
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-400 dark:text-slate-500">No activity yet</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
