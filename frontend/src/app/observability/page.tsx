"use client";

import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantInputModule } from "@/components/assistant/AssistantInputModule";
import { 
  Activity, Cpu, HardDrive, Globe, Database, 
  Server, Cloud, AlertTriangle, Clock, TrendingUp, CheckCircle, LayoutDashboard as LayoutDashboardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ObservabilityAgentPage() {
  const router = useRouter();

  const quickActions = [
    {
      label: "Monitor CPU Usage",
      prompt: "Show me CPU usage trends across all virtual machines in the last 24 hours.",
      icon: <Cpu className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Check Memory Usage",
      prompt: "Analyze memory consumption patterns and identify potential memory leaks.",
      icon: <Server className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Network Analytics",
      prompt: "Show network traffic patterns and identify any anomalies or bottlenecks.",
      icon: <Globe className="h-4 w-4 text-green-500" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      label: "Storage Monitoring",
      prompt: "Monitor storage usage across all accounts and identify capacity planning needs.",
      icon: <HardDrive className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Database Performance",
      prompt: "Analyze database performance metrics and identify slow queries or connection issues.",
      icon: <Database className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Alert Management",
      prompt: "Show active alerts and their severity levels across all monitored resources.",
      icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
    },
    {
      label: "Custom Dashboard",
      prompt: "Create a custom dashboard to monitor specific metrics and KPIs for my workloads.",
      icon: <LayoutDashboardIcon className="h-4 w-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
    },
  ];

  const placeholderVariants = [
    "Analyze CPU spikes across production resources...",
    "Show infrastructure alerts from last 24 hours...",
    "Detect abnormal network latency patterns...",
  ];

  const keyMetrics = [
    { title: "Avg CPU", value: "45%", trend: "+2.3%", icon: <Cpu className="h-4 w-4" />, color: "blue" },
    { title: "Avg Memory", value: "62%", trend: "+1.8%", icon: <Server className="h-4 w-4" />, color: "purple" },
    { title: "Network IO", value: "1.2 GB", trend: "-0.5%", icon: <Globe className="h-4 w-4" />, color: "green" },
    { title: "Storage Used", value: "3.4 TB", trend: "+5.2%", icon: <HardDrive className="h-4 w-4" />, color: "amber" },
  ];

  const dashboardCards = [
    {
      title: "Infrastructure Overview",
      description: "Complete infrastructure health and status",
      icon: <LayoutDashboardIcon className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
    },
    {
      title: "Compute Metrics",
      description: "CPU, memory, and performance metrics",
      icon: <Cpu className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
    },
    {
      title: "Network Analytics",
      description: "Network traffic and connectivity insights",
      icon: <Globe className="h-5 w-5 text-green-600" />,
      iconBg: "bg-green-100 dark:bg-green-900/40",
    },
    {
      title: "Storage Insights",
      description: "Storage capacity and performance",
      icon: <HardDrive className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
    },
    {
      title: "Application Health",
      description: "Application performance and availability",
      icon: <Cloud className="h-5 w-5 text-cyan-600" />,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
    },
    {
      title: "Custom Dashboard",
      description: "Build your own monitoring dashboard",
      icon: <Activity className="h-5 w-5 text-indigo-600" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    },
  ];

  const activeAlerts = [
    { id: 1, severity: "critical", message: "High CPU usage on prod-web-001", resource: "prod-web-001", time: "5 min ago" },
    { id: 2, severity: "warning", message: "Memory pressure on db-server-02", resource: "db-server-02", time: "12 min ago" },
    { id: 3, severity: "info", message: "Backup completed successfully", resource: "backup-system", time: "1 hour ago" },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "warning":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "info":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator userName="Harsh Pardhi" />
        
        <main className="p-4 lg:p-5">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Observability Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Monitor and analyze your Azure infrastructure performance and health.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/dashboard')}
                    className="h-8 text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 hover:bg-azure-50 dark:hover:bg-azure-900/20"
                  >
                    <LayoutDashboardIcon className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant Section */}
            <AssistantInputModule
              title="Observability Assist"
              icon={<Activity className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              className="mb-6"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Key Metrics */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Key Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {keyMetrics.map((metric, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn("p-1.5 rounded-md", `bg-${metric.color}-100 dark:bg-${metric.color}-900/30`)}>
                              {metric.icon}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-slate-400">{metric.title}</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{metric.value}</p>
                          <p className={cn(
                            "text-xs font-medium",
                            metric.trend.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {metric.trend}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Dashboards Grid */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Dashboards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dashboardCards.map((card, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", card.iconBg)}>
                            {card.icon}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {card.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {card.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Alerts */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Active Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeAlerts.map((alert) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <AlertTriangle className={cn(
                              "h-4 w-4",
                              alert.severity === "critical" ? "text-red-500" : 
                              alert.severity === "warning" ? "text-amber-500" : "text-blue-500"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {alert.message}
                              </p>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ml-2",
                                getSeverityColor(alert.severity)
                              )}>
                                {alert.severity}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {alert.resource} • {alert.time}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar Widgets */}
              <div className="space-y-4">
                {/* Resource Health */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Resource Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Healthy</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">142</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Warning</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">8</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Critical</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">3</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* System Uptime */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      System Uptime
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">99.9%</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Last 30 days
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        <Activity className="h-4 w-4 mr-2 text-blue-500" />
                        View All Metrics
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                        Alert Rules
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        <TrendingUp className="h-4 w-4 mr-2 text-emerald-500" />
                        Performance Reports
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}