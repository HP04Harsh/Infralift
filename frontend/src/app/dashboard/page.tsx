"use client";

import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { motion } from "framer-motion";
import { Server, AlertTriangle, DollarSign, Shield, Cloud, Activity, Play, FileText, CreditCard, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  // Initial empty state metrics with colored icons
  const metricCards = [
    {
      title: "Total Resource Groups",
      value: "0",
      subtext: "Calculating...",
      icon: <Cloud className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      title: "Virtual Machines",
      value: "0",
      subtext: "Sync in progress...",
      icon: <Server className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      title: "Active Risk",
      value: "0",
      subtext: "Awaiting telemetry...",
      variant: "default" as const,
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      title: "Monthly Cost",
      value: "$0",
      subtext: "Calculating...",
      icon: <DollarSign className="h-4 w-4 text-green-500" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      title: "Compliance Score",
      value: "0%",
      subtext: "Awaiting data...",
      variant: "default" as const,
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    },
  ];

  const quickActions = [
    {
      title: "Provision Resource",
      description: "Create new Azure resources",
      icon: <Play className="h-4 w-4 text-azure-500" />,
    },
    {
      title: "Check Compliance",
      description: "Validate policy compliance",
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
    },
    {
      title: "Optimize Costs",
      description: "Reduce infrastructure costs",
      icon: <DollarSign className="h-4 w-4 text-amber-500" />,
    },
    {
      title: "Open ITSM Ticket",
      description: "Create support ticket",
      icon: <FileText className="h-4 w-4 text-purple-500" />,
    },
    {
      title: "View Dashboards",
      description: "Monitor resource metrics",
      icon: <LayoutDashboard className="h-4 w-4 text-pink-500" />,
    },
  ];

  // Initial onboarding state activities
  const activities = [
    { title: "New user onboarded", status: "Completed" as const, timestamp: "Just now" },
    { title: "Tenant sync in progress", status: "In Progress" as const, timestamp: "Just now" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator userName="Harsh Pardhi" />
        
        <main className="p-4 lg:p-5">
          <div className="max-w-6xl mx-auto">
            <DashboardHero userName="Harsh Pardhi" />
            
            {/* Overview Section with Heading */}
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Overview</h2>
              
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
              {/* Quick Actions - Grid Layout */}
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
                      {/* Grid layout for quick actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {quickActions.map((action, index) => (
                          <QuickActionCard key={index} {...action} />
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
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Activity className="h-4 w-4" />
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
