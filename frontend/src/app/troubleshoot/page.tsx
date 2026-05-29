"use client";

import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantInputModule } from "@/components/assistant/AssistantInputModule";
import { 
  AlertTriangle, Server, Globe, FileText, 
  Settings, Wrench, Activity, CheckCircle, Clock, User, Search, LayoutDashboard as LayoutDashboardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function TroubleshootAgentPage() {
  const router = useRouter();

  const quickActions = [
    {
      label: "Diagnose VM Issue",
      prompt: "Diagnose the connectivity issue with [VM Name] and provide troubleshooting steps.",
      icon: <Server className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Network Analysis",
      prompt: "Analyze network connectivity and identify any routing or firewall issues.",
      icon: <Globe className="h-4 w-4 text-green-500" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      label: "Log Analysis",
      prompt: "Analyze recent logs from [Resource Name] to identify error patterns and root causes.",
      icon: <FileText className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Performance Issues",
      prompt: "Investigate performance degradation in [Application Name] and identify bottlenecks.",
      icon: <Activity className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Resource Status",
      prompt: "Check the current status and health of [Resource Type] and identify any issues.",
      icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
    },
    {
      label: "Configuration Check",
      prompt: "Validate the configuration of [Resource Name] and identify any misconfigurations.",
      icon: <Settings className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Resource Repair",
      prompt: "Attempt automatic repair of [Resource Name] to resolve common issues.",
      icon: <Wrench className="h-4 w-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
    },
  ];

  const placeholderVariants = [
    "Diagnose VM connectivity issues...",
    "Investigate latency spike in production...",
    "Analyze application crash logs...",
  ];

  const diagnosticTools = [
    {
      title: "VM Diagnostics",
      description: "Analyze VM health and performance",
      icon: <Server className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
    },
    {
      title: "Network Watcher",
      description: "Monitor network connectivity and topology",
      icon: <Globe className="h-5 w-5 text-green-600" />,
      iconBg: "bg-green-100 dark:bg-green-900/40",
    },
    {
      title: "Log Analytics",
      description: "Query and analyze log data",
      icon: <FileText className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
    },
    {
      title: "Runbook Automation",
      description: "Automate troubleshooting workflows",
      icon: <Settings className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
    },
    {
      title: "Config Analysis",
      description: "Analyze resource configurations",
      icon: <Wrench className="h-5 w-5 text-cyan-600" />,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
    },
    {
      title: "Auto-Repair",
      description: "Automated issue detection and repair",
      icon: <Activity className="h-5 w-5 text-indigo-600" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    },
  ];

  const recentIssues = [
    { id: 1, severity: "critical", title: "VM connectivity failure", resource: "prod-web-001", status: "investigating", assignee: "Harsh Pardhi", time: "15 min ago" },
    { id: 2, severity: "warning", title: "High memory usage", resource: "db-server-02", status: "resolved", assignee: "System", time: "1 hour ago" },
    { id: 3, severity: "info", title: "Configuration drift detected", resource: "app-service-prod", status: "monitoring", assignee: "Harsh Pardhi", time: "2 hours ago" },
    { id: 4, severity: "critical", title: "Database connection timeout", resource: "sql-cluster-01", status: "resolved", assignee: "DB Team", time: "4 hours ago" },
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "investigating":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "monitoring":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400";
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
                    Troubleshoot Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Diagnose and resolve Azure infrastructure issues.
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
              title="Troubleshoot Assist"
              icon={<Wrench className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              className="mb-6"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Diagnostic Tools */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Diagnostic Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {diagnosticTools.map((tool, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", tool.iconBg)}>
                            {tool.icon}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {tool.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {tool.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Issues */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Recent Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[180px]">Issue</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[120px]">Resource</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[80px]">Severity</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[100px]">Status</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[120px]">Assignee</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[100px]">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentIssues.map((issue) => (
                            <tr key={issue.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{issue.title}</td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{issue.resource}</td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                                  getSeverityColor(issue.severity)
                                )}>
                                  {issue.severity}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-medium",
                                  getStatusColor(issue.status)
                                )}>
                                  {issue.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {issue.assignee}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {issue.time}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar Widgets */}
              <div className="space-y-4">
                {/* Issue Summary */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Issue Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Critical</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">2</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Warning</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">5</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Info</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">8</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resolution Stats */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                  Resolution Stats
                </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Resolved Today</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">12</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Avg Resolution Time</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">2.5h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Auto-Resolved</span>
                        <span className="text-sm font-semibold text-azure-600 dark:text-azure-400">8</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Common Solutions */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Common Solutions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        <Search className="h-4 w-4 mr-2 text-blue-500" />
                        Restart VM
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        <Globe className="h-4 w-4 mr-2 text-green-500" />
                        Check Network Rules
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        <Wrench className="h-4 w-4 mr-2 text-amber-500" />
                        Reset Configuration
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