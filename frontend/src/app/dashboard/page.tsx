"use client";

import { useState, useEffect, useCallback } from "react";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { motion, AnimatePresence } from "framer-motion";
import { Server, AlertTriangle, DollarSign, Shield, Cloud, Activity, Play, FileText, CreditCard, LayoutDashboard, BarChart3, Wifi, HardDrive, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboardingStore";
import { PortalLoader } from "@/components/ui/PortalLoader";
import { useTenantDataStore } from "@/store/tenantDataStore";

export default function DashboardPage() {
  const router = useRouter();
  const { progress } = useOnboardingStore();
  const loading = useTenantDataStore((s) => s.loading);
  const stats = useTenantDataStore((s) => s.stats);
  const security = useTenantDataStore((s) => s.security);
  const costs = useTenantDataStore((s) => s.costs);
  const error = useTenantDataStore((s) => s.error);
  const fetchAll = useTenantDataStore((s) => s.fetchAll);
  const [activityFeed, setActivityFeed] = useState<{ title: string; status: "Completed" | "In Progress"; timestamp: string }[]>([]);
  const [pollCount, setPollCount] = useState(0);

  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$", INR: "₹", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$", BRL: "R$",
  };
  const currencySymbol = CURRENCY_SYMBOLS[costs?.currency ?? "USD"] ?? "$";

  // Guard: Redirect to onboarding if not completed
  useEffect(() => {
    if (progress < 100) {
      router.replace("/onboarding");
    }
  }, [progress, router]);

  // Fetch live data from store on mount
  useEffect(() => {
    if (progress >= 100 && loading) {
      fetchAll();
    }
  }, [progress, loading, fetchAll]);

  // Poll tenant data every 30 seconds for real-time activity
  useEffect(() => {
    if (progress < 100) return;
    const interval = setInterval(() => {
      fetchAll();
      setPollCount((c) => c + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [progress, fetchAll]);

  // Build activity feed from latest data
  useEffect(() => {
    const now = new Date().toLocaleString();
    const activities = [];
    if (stats?.synced_at) {
      activities.push({ title: "Tenant sync completed", status: "Completed" as const, timestamp: new Date(stats.synced_at).toLocaleString() });
    }
    activities.push({ title: `${totalResources} resources discovered across ${totalRgs} resource groups`, status: "Completed" as const, timestamp: "During last sync" });
    activities.push({ title: `Cost tracking active — ${currencySymbol}${(costs?.month_to_date ?? 0).toLocaleString()} MTD`, status: "Completed" as const, timestamp: now });
    if (security) {
      activities.push({ title: `Security monitoring — ${security.total_alerts} active alerts`, status: security.total_alerts > 0 ? "In Progress" as const : "Completed" as const, timestamp: now });
      activities.push({ title: `Secure score: ${security.secure_score_percentage ?? 0}%`, status: (security.secure_score_percentage ?? 0) >= 70 ? "Completed" as const : "In Progress" as const, timestamp: now });
    }
    if (error) activities.push({ title: "Data sync unavailable", status: "In Progress" as const, timestamp: "Retrying..." });
    setActivityFeed(activities);
  }, [stats, costs, security, error, pollCount, currencySymbol]);

  // Show loading state while checking
  if (progress < 100 || loading) {
    return <PortalLoader />;
  }

  const byType = stats?.by_type ?? {};
  const totalVms = byType["Microsoft.Compute/virtualMachines"] ?? 0;
  const totalRgs = byType["Microsoft.Resources/resourceGroups"] ?? 0;
  const totalResources = stats?.total_resources ?? 0;

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
      subtext: `${byType["Microsoft.Network/virtual_network"] ?? 0} networks`,
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
      value: `${currencySymbol}${(costs?.month_to_date ?? 0).toLocaleString()}`,
      subtext: `Forecast: ${currencySymbol}${(costs?.forecast ?? 0).toLocaleString()}`,
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
    {
      title: "Provision Resource",
      description: "Create new Azure resources",
      icon: <Play className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      path: "/provisioning",
    },
    {
      title: "Check Compliance",
      description: "Validate policy compliance",
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
      path: "/compliance",
    },
    {
      title: "Optimize Costs",
      description: "Reduce infrastructure costs",
      icon: <DollarSign className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
      path: "/optimization",
    },
    {
      title: "Open ITSM Ticket",
      description: "Create support ticket",
      icon: <FileText className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
      path: "/itsm",
    },
    {
      title: "View Observability",
      description: "Monitor resource metrics",
      icon: <BarChart3 className="h-4 w-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
      path: "/observability",
    },
    {
      title: "Run Assessment",
      description: "Analyze infrastructure health",
      icon: <Activity className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
      path: "/assessment",
    },
  ];

  const activities = activityFeed;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator userName="Harsh Pardhi" />
        
        <main className="p-4 lg:p-5">
          <div className="max-w-6xl mx-auto">
            <DashboardHero userName="Harsh Pardhi" />
            
            {/* Overview Section */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Overview</h2>
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {metricCards.map((card, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                  >
                    <MetricCard {...card} />
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Quick Actions */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {quickActions.map((action, index) => (
                          <motion.div
                            key={index}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push(action.path)}
                            className="cursor-pointer"
                          >
                            <QuickActionCard {...action} iconBg={action.iconBg} />
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activities.map((activity, index) => (
                        <ActivityItem key={index} {...activity} />
                      ))}
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
