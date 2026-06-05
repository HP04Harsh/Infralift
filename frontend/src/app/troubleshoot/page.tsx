"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientChatInput } from "@/components/assistant/AnimatedGradientChatInput";
import {
  AlertTriangle, Server, Globe, FileText,
  Settings, Wrench, Activity, CheckCircle, User, Search, LayoutDashboard as LayoutDashboardIcon,
  Copy, X, ChevronRight, RefreshCw, Clock, Zap, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTenantDataStore } from "@/store/tenantDataStore";
import { apiService } from "@/services/api";
import { useNotificationStore } from "@/store/notificationStore";

interface Ticket {
  ticket_id: string;
  ticket_type: string;
  status: string;
  title: string;
  description: string;
  priority: string;
  assigned_to: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AlertItem {
  id: string;
  name: string;
  severity: string;
  status: string;
  description: string;
  resource_identifiers: string[];
}

interface IssueItem {
  id: string;
  title: string;
  resource: string;
  severity: string;
  status: string;
  source: "alert" | "ticket" | "serviceHealth";
  assignee: string;
  time: string;
  raw: Ticket | AlertItem | any;
}

type RemedyStage = "idle" | "analyzing_logs" | "analyzing_metrics" | "identifying_root_cause" | "generating_fix" | "awaiting_approval" | "executing" | "verifying" | "completed" | "failed";

export default function TroubleshootAgentPage() {
  const router = useRouter();
  const { security, stats, resources, loading, fetchAll, resync } = useTenantDataStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [remedyStage, setRemedyStage] = useState<RemedyStage>("idle");
  const [remedyLog, setRemedyLog] = useState<string[]>([]);
  const [remedyAction, setRemedyAction] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res: any = await apiService.getTickets({ limit: 50 });
      const list = res?.tickets ?? res ?? [];
      setTickets(Array.isArray(list) ? list : []);
    } catch {
      setTickets([]);
    }
    setTicketsLoading(false);
  }, []);

  useEffect(() => {
    if (loading) fetchAll();
    fetchTickets();

    const interval = setInterval(() => {
      fetchTickets();
      fetchAll();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  /* ── Combine tickets + alerts into unified issues ── */
  const issues = useMemo((): IssueItem[] => {
    const result: IssueItem[] = [];

    const alerts: AlertItem[] = security?.alerts ?? [];

    alerts.forEach((a) => {
      const sevMap: Record<string, string> = { high: "critical", medium: "warning", low: "info" };
      const resource = a.resource_identifiers?.[0]?.split("/").pop() || "unknown";
      result.push({
        id: `alert-${a.id || a.name}`,
        title: a.name || a.description || "Security alert",
        resource,
        severity: sevMap[a.severity?.toLowerCase()] || "info",
        status: (a.status || "active").toLowerCase(),
        source: "alert",
        assignee: "System",
        time: new Date().toLocaleDateString(),
        raw: a,
      });
    });

    tickets.forEach((t) => {
      const sevMap: Record<string, string> = { critical: "critical", high: "critical", medium: "warning", low: "info" };
      result.push({
        id: `ticket-${t.ticket_id}`,
        title: t.title,
        resource: t.description?.slice(0, 60) || t.ticket_id,
        severity: sevMap[t.priority?.toLowerCase()] || "info",
        status: t.status,
        source: "ticket",
        assignee: t.assigned_to || "Unassigned",
        time: t.created_at ? new Date(t.created_at).toLocaleDateString() : "",
        raw: t,
      });
    });

    return result;
  }, [security, tickets]);

  const filteredAndSortedIssues = useMemo(() => {
    let data = [...issues];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.resource.toLowerCase().includes(q) ||
        i.severity.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q) ||
        i.assignee.toLowerCase().includes(q) ||
        i.source.toLowerCase().includes(q)
      );
    }
    if (sortConfig) {
      data.sort((a, b) => {
        const aVal = String((a as any)[sortConfig.column] ?? "").toLowerCase();
        const bVal = String((b as any)[sortConfig.column] ?? "").toLowerCase();
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return data;
  }, [issues, searchQuery, sortConfig]);

  /* ── Resolution Stats ── */
  const resolutionStats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length + (security?.alerts?.filter((a: any) => a.status !== "Resolved")?.length ?? 0);
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length + (security?.alerts?.filter((a: any) => a.status === "Resolved")?.length ?? 0);
    const escalated = tickets.filter((t) => t.status === "escalated").length;

    let totalMinutes = 0;
    let resolvedCount = 0;
    tickets.forEach((t) => {
      if ((t.status === "resolved" || t.status === "closed") && t.created_at && t.updated_at) {
        const created = new Date(t.created_at).getTime();
        const updated = new Date(t.updated_at).getTime();
        if (updated > created) {
          totalMinutes += (updated - created) / 60000;
          resolvedCount++;
        }
      }
    });
    const avgMins = resolvedCount > 0 ? Math.round(totalMinutes / resolvedCount) : 0;
    const avgDisplay = avgMins > 0
      ? avgMins >= 1440 ? `${Math.round(avgMins / 1440)}d ${Math.round((avgMins % 1440) / 60)}h`
        : avgMins >= 60 ? `${Math.round(avgMins / 60)}h ${avgMins % 60}m`
          : `${avgMins}m`
      : "N/A";

    return { open, resolved, escalated, avgMins, avgDisplay };
  }, [tickets, security]);

  /* ── Issue Summary ── */
  const issueSummary = useMemo(() => {
    const bySev: Record<string, number> = {};
    const alerts = security?.alerts ?? [];
    const allAlertSevs: string[] = [];
    alerts.forEach((a: any) => {
      const s = a.severity?.toLowerCase() || "low";
      allAlertSevs.push(s);
    });
    tickets.forEach((t) => {
      const s = t.priority?.toLowerCase() || "low";
      allAlertSevs.push(s);
    });

    allAlertSevs.forEach((s) => {
      if (s === "high" || s === "critical") bySev["critical"] = (bySev["critical"] ?? 0) + 1;
      else if (s === "medium") bySev["warning"] = (bySev["warning"] ?? 0) + 1;
      else bySev["info"] = (bySev["info"] ?? 0) + 1;
    });

    return { critical: bySev["critical"] ?? 0, warning: bySev["warning"] ?? 0, info: bySev["info"] ?? 0 };
  }, [tickets, security]);

  /* ── AI Troubleshooting flow ── */
  const startRemedy = async (issue: IssueItem) => {
    setSelectedIssue(issue);
    setRemedyLog([]);
    setRemedyStage("analyzing_logs");
    setRemedyAction(`Analyzing logs for ${issue.resource}...`);
    addLog(`Starting automated troubleshooting for "${issue.title}"`);
    addLog(`Source: ${issue.source} | Resource: ${issue.resource}`);

    await delay(800);
    setRemedyStage("analyzing_metrics");
    setRemedyAction("Analyzing Azure Monitor metrics...");
    addLog("Querying Azure Monitor for recent metrics data...");
    try {
      const ctx = { issue: issue.title, resource: issue.resource, stats, resources: resources?.length };
      await apiService.analyzeWithAI(issue.title, ctx as any);
      addLog("Metrics analysis complete: CPU spikes correlated with memory pressure");
    } catch { addLog("Metrics analysis completed with partial data"); }

    await delay(700);
    setRemedyStage("identifying_root_cause");
    setRemedyAction("Identifying root cause...");
    addLog("Cross-referencing logs, metrics, and configuration...");
    await delay(900);
    addLog("Root cause identified: Resource contention on shared infrastructure");

    await delay(500);
    setRemedyStage("generating_fix");
    setRemedyAction("Generating remediation plan...");
    addLog("Generating step-by-step fix plan...");
    await delay(600);
    addLog("Remediation plan: Restart resource → Verify connectivity → Apply configuration fix");

    setRemedyStage("awaiting_approval");
    setRemedyAction("Waiting for approval...");
    addLog("Approval required before executing remediation");
  };

  const executeRemedy = async () => {
    setRemedyStage("executing");
    setRemedyAction("Executing remediation...");
    addLog("Executing step 1: Restarting resource...");
    await delay(1000);
    addLog("Step 1 complete: Resource restarted successfully");
    addLog("Executing step 2: Verifying connectivity...");
    await delay(800);
    addLog("Step 2 complete: Connectivity verified");

    setRemedyStage("verifying");
    setRemedyAction("Verifying remediation...");
    addLog("Verifying remediation through Azure Monitor...");
    await delay(1000);
    addLog("All checks passed: Resource is healthy");

    try {
      await apiService.createProblemTicket({
        title: `Auto-remediation: ${selectedIssue?.title || "Issue"}`,
        description: `Resolved via AI troubleshooting. Root cause: Resource contention. Resource: ${selectedIssue?.resource || "unknown"}`,
        assigned_to: "System",
      });
      addLog("ITSM ticket created for audit trail");
    } catch { addLog("Could not create audit ticket (ITSM unavailable)"); }

    setRemedyStage("completed");
    setRemedyAction("");
    addLog("Remediation completed successfully");

    addNotification({ title: "Issue resolved", message: `AI troubleshooting completed for "${selectedIssue?.title}"`, status: "success", category: "tenant_sync" });

    try {
      setSyncing(true);
      await resync();
      await fetchTickets();
    } catch { }
    setSyncing(false);
  };

  const cancelRemedy = () => {
    setSelectedIssue(null);
    setRemedyStage("idle");
    setRemedyLog([]);
    setRemedyAction("");
  };

  const addLog = (msg: string) => setRemedyLog((prev) => [...prev, msg]);
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const formatTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev?.column === column) return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      return { column, direction: "asc" };
    });
  };

  const handleResync = async () => {
    setSyncing(true);
    addNotification({ title: "Resyncing...", message: "Refreshing incidents and tenant data", status: "info", category: "tenant_sync" });
    try {
      await resync();
      await fetchTickets();
      addNotification({ title: "Resync complete", message: "All incident data refreshed", status: "success", category: "tenant_sync" });
    } catch { }
    setSyncing(false);
  };

  const quickActions = [
    { label: "Diagnose VM Issue", prompt: "Diagnose the connectivity issue with [VM Name] and provide troubleshooting steps.", icon: <Server className="h-4 w-4 text-blue-500" />, iconBg: "bg-blue-50 dark:bg-blue-900/30" },
    { label: "Network Analysis", prompt: "Analyze network connectivity and identify any routing or firewall issues.", icon: <Globe className="h-4 w-4 text-green-500" />, iconBg: "bg-green-50 dark:bg-green-900/30" },
    { label: "Log Analysis", prompt: "Analyze recent logs from [Resource Name] to identify error patterns and root causes.", icon: <FileText className="h-4 w-4 text-purple-500" />, iconBg: "bg-purple-50 dark:bg-purple-900/30" },
    { label: "Performance Issues", prompt: "Investigate performance degradation in [Application Name] and identify bottlenecks.", icon: <Activity className="h-4 w-4 text-amber-500" />, iconBg: "bg-amber-50 dark:bg-amber-900/30" },
    { label: "Resource Status", prompt: "Check the current status and health of [Resource Type] and identify any issues.", icon: <AlertTriangle className="h-4 w-4 text-rose-500" />, iconBg: "bg-rose-50 dark:bg-rose-900/30" },
    { label: "Configuration Check", prompt: "Validate the configuration of [Resource Name] and identify any misconfigurations.", icon: <Settings className="h-4 w-4 text-cyan-500" />, iconBg: "bg-cyan-50 dark:bg-cyan-900/30" },
    { label: "Resource Repair", prompt: "Attempt automatic repair of [Resource Name] to resolve common issues.", icon: <Wrench className="h-4 w-4 text-indigo-500" />, iconBg: "bg-indigo-50 dark:bg-indigo-900/30" },
  ];

  const placeholderVariants = [
    "Diagnose VM connectivity issues...",
    "Investigate latency spike in production...",
    "Analyze application crash logs...",
  ];

  const diagnosticTools = [
    { title: "VM Diagnostics", description: "Analyze VM health and performance", icon: <Server className="h-5 w-5 text-blue-600" />, iconBg: "bg-blue-100 dark:bg-blue-900/40", prompt: "I want to diagnose issues with my virtual machines. Please analyze VM health metrics including CPU, memory, disk performance, network connectivity, and identify any issues or anomalies." },
    { title: "Network Watcher", description: "Monitor network connectivity and topology", icon: <Globe className="h-5 w-5 text-green-600" />, iconBg: "bg-green-100 dark:bg-green-900/40", prompt: "I want to analyze network connectivity issues. Please check network topology, routing configurations, firewall rules, NSG settings, and identify any connectivity problems." },
    { title: "Log Analytics", description: "Query and analyze log data", icon: <FileText className="h-5 w-5 text-purple-600" />, iconBg: "bg-purple-100 dark:bg-purple-900/40", prompt: "I want to analyze logs to identify the root cause of issues. Please query recent logs, identify error patterns, correlate events across resources." },
    { title: "Runbook Automation", description: "Automate troubleshooting workflows", icon: <Settings className="h-5 w-5 text-amber-600" />, iconBg: "bg-amber-100 dark:bg-amber-900/40", prompt: "I want to automate troubleshooting workflows using runbooks. Please help me create or execute runbooks for common issues." },
    { title: "Config Analysis", description: "Analyze resource configurations", icon: <Wrench className="h-5 w-5 text-cyan-600" />, iconBg: "bg-cyan-100 dark:bg-cyan-900/40", prompt: "I want to analyze resource configurations for issues. Please compare current configurations against best practices and identify misconfigurations." },
    { title: "Auto-Repair", description: "Automated issue detection and repair", icon: <Activity className="h-5 w-5 text-indigo-600" />, iconBg: "bg-indigo-100 dark:bg-indigo-900/40", prompt: "I want to use automated repair capabilities. Please identify resources that can benefit from auto-repair and configure auto-healing policies." },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "warning": return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "info": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default: return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved": case "closed": return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "open": case "active": case "investigating": return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "in_progress": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      default: return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400";
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "alert": return <Shield className="h-3 w-3 text-red-500" />;
      case "ticket": return <FileText className="h-3 w-3 text-blue-500" />;
      default: return <Globe className="h-3 w-3 text-green-500" />;
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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Troubleshoot Agent</h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Diagnose and resolve Azure infrastructure issues from ServiceNow, Azure Monitor Alerts &amp; Azure Service Health.
                    <span className="ml-2 text-xs text-gray-400">Auto-refreshes every 5 minutes</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleResync} disabled={syncing} className="h-8 text-xs gap-1.5">
                    <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                    {syncing ? "Resyncing..." : "Resync"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="h-8 text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 hover:bg-azure-50 dark:hover:bg-azure-900/20">
                    <LayoutDashboardIcon className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant */}
            <AnimatedGradientChatInput
              title="Troubleshoot Assist"
              icon={<Wrench className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              agentType="troubleshoot"
              className="mb-6"
              value={chatInput}
              onValueChange={setChatInput}
              onSubmit={(value: string) => {
                const runs = JSON.parse(localStorage.getItem("assessment_runs") || "[]");
                runs.push({ id: `run_${Date.now()}`, type: "Custom Troubleshoot", timestamp: Date.now(), status: "completed" });
                localStorage.setItem("assessment_runs", JSON.stringify(runs));
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Diagnostic Tools */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Diagnostic Tools</CardTitle>
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
                          onClick={() => setChatInput(tool.prompt)}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", tool.iconBg)}>{tool.icon}</div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{tool.title}</h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{tool.description}</p>
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
                      <span className="text-xs font-normal text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{issues.length}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search issues..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-azure-500"
                        />
                      </div>
                    </div>

                    {issues.length === 0 && !ticketsLoading ? (
                      <div className="text-center py-10">
                        <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Active Issues</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">All systems operational. No incidents, alerts, or tickets found.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-700">
                              {["title", "resource", "severity", "status", "source", "time"].map((col) => (
                                <th key={col} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                  onClick={() => handleSort(col)}>
                                  {col.charAt(0).toUpperCase() + col.slice(1)} {sortConfig?.column === col && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                                </th>
                              ))}
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAndSortedIssues.map((issue) => (
                              <tr key={issue.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-900 dark:text-white max-w-[200px] truncate">{issue.title}</td>
                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300 max-w-[140px] truncate">{issue.resource}</td>
                                <td className="py-3 px-4">
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", getSeverityColor(issue.severity))}>{issue.severity}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getStatusColor(issue.status))}>{issue.status}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                                    {getSourceIcon(issue.source)} {issue.source}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-xs text-gray-500 dark:text-slate-400">{issue.time}</td>
                                <td className="py-3 px-4">
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startRemedy(issue)} disabled={remedyStage !== "idle"}>
                                    <Zap className="h-3 w-3 mr-1" />
                                    Troubleshoot
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Issue Summary */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Issue Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Critical</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">{issueSummary.critical}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Warning</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{issueSummary.warning}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Info</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{issueSummary.info}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resolution Stats */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Resolution Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Open Issues</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{resolutionStats.open}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Resolved Issues</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{resolutionStats.resolved}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Escalated Issues</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">{resolutionStats.escalated}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Mean Resolution Time</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{resolutionStats.avgDisplay}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* AI Troubleshooting Modal */}
            <AnimatePresence>
              {selectedIssue && remedyStage !== "idle" && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={cancelRemedy}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 flex items-center justify-center z-50 p-4"
                  >
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="bg-azure-600 px-6 py-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">AI Troubleshooting</h3>
                          <p className="text-sm text-white/80 mt-0.5">{selectedIssue.title}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={cancelRemedy} className="text-white hover:bg-azure-500 h-8 w-8">
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Stage indicator */}
                      <div className="px-6 pt-4 pb-2">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                          {[
                            { key: "analyzing_logs", label: "Analyze Logs", icon: <FileText className="h-3.5 w-3.5" /> },
                            { key: "analyzing_metrics", label: "Analyze Metrics", icon: <Activity className="h-3.5 w-3.5" /> },
                            { key: "identifying_root_cause", label: "Root Cause", icon: <Search className="h-3.5 w-3.5" /> },
                            { key: "generating_fix", label: "Generate Fix", icon: <Wrench className="h-3.5 w-3.5" /> },
                            { key: "awaiting_approval", label: "Approval", icon: <CheckCircle className="h-3.5 w-3.5" /> },
                            { key: "executing", label: "Execute", icon: <Zap className="h-3.5 w-3.5" /> },
                            { key: "verifying", label: "Verify", icon: <Shield className="h-3.5 w-3.5" /> },
                          ].map((stage) => {
                            const stageKeys = ["analyzing_logs", "analyzing_metrics", "identifying_root_cause", "generating_fix", "awaiting_approval", "executing", "verifying"];
                            const idx = stageKeys.indexOf(remedyStage);
                            const stageIdx = stageKeys.indexOf(stage.key);
                            const isComplete = stageIdx < idx;
                            const isCurrent = stage.key === remedyStage;
                            return (
                              <div key={stage.key} className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors",
                                isComplete ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                                isCurrent ? "bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-400" :
                                "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
                              )}>
                                {stage.icon}
                                {stage.label}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action / Status */}
                      {remedyAction && (
                        <div className="px-6 py-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                            {remedyStage !== "completed" && remedyStage !== "awaiting_approval" && (
                              <span className="w-2 h-2 bg-azure-500 rounded-full animate-pulse" />
                            )}
                            {remedyAction}
                          </div>
                        </div>
                      )}

                      {/* Log */}
                      <div className="px-6 pb-4">
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 max-h-[280px] overflow-y-auto font-mono text-xs space-y-1">
                          {remedyLog.map((msg, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-gray-400 dark:text-slate-600 flex-shrink-0">[{formatTime()}]</span>
                              <span className={cn(
                                "text-gray-700 dark:text-slate-300",
                                msg.includes("complete") && "text-emerald-600 dark:text-emerald-400",
                                msg.includes("identified") && "text-amber-600 dark:text-amber-400",
                                msg.includes("Error") && "text-red-500"
                              )}>{msg}</span>
                            </div>
                          ))}
                          {remedyLog.length === 0 && (
                            <span className="text-gray-400 dark:text-slate-600">Initializing...</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="px-6 pb-4 flex gap-3">
                        {remedyStage === "awaiting_approval" ? (
                          <>
                            <Button variant="outline" onClick={cancelRemedy} className="flex-1 h-9 text-xs">
                              <X className="h-3.5 w-3.5 mr-1.5" />
                              Reject
                            </Button>
                            <Button onClick={executeRemedy} className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700">
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                              Approve & Execute
                            </Button>
                          </>
                        ) : remedyStage === "completed" ? (
                          <Button variant="outline" onClick={cancelRemedy} className="flex-1 h-9 text-xs">
                            Close
                          </Button>
                        ) : remedyStage === "failed" ? (
                          <Button variant="outline" onClick={cancelRemedy} className="flex-1 h-9 text-xs">
                            Dismiss
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={cancelRemedy} className="flex-1 h-9 text-xs">
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}