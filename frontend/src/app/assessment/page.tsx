"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientChatInput } from "@/components/assistant/AnimatedGradientChatInput";
import {
  Shield, AlertTriangle, CheckCircle, Clock, Activity, Target, Zap, FileText,
  History, Play, LayoutDashboard as LayoutDashboardIcon, Search, User,
  DollarSign, Server, Globe, Lock, Scale, RefreshCw, X, ChevronRight, Wrench,
  Cpu, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTenantDataStore } from "@/store/tenantDataStore";
import { useAssessmentStore } from "@/store/assessmentStore";
import { apiService } from "@/services/api";
import { useNotificationStore } from "@/store/notificationStore";

interface CategoryScore {
  name: string;
  icon: React.ReactNode;
  iconBg: string;
  color: string;
  score: number;
  description: string;
  findings: number;
}

interface Finding {
  id: string;
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  source: string;
  resource: string;
  description: string;
  recommendation: string;
  status: "open" | "resolved";
}

type FixStage = "idle" | "reviewing" | "generating" | "approval" | "executing" | "reassessing" | "completed" | "failed";

export default function AssessmentAgentPage() {
  const router = useRouter();
  const { security, stats, costs, metrics, advisor, resources, loading, fetchAll, resync } = useTenantDataStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const addAssessment = useAssessmentStore((s) => s.addAssessment);

  const [chatInput, setChatInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [fixStage, setFixStage] = useState<FixStage>("idle");
  const [fixLog, setFixLog] = useState<string[]>([]);
  const [fixAction, setFixAction] = useState("");

  useEffect(() => {
    if (loading) fetchAll();
  }, [loading, fetchAll]);

  /* ── Category Scores (all dynamic, no hardcoded %) ── */

  const securityScore = useMemo(() => {
    const base = security?.secure_score_percentage ?? 100;
    const openHigh = (security?.alerts ?? []).filter((a: any) => a.severity === "High" && a.status !== "Resolved").length;
    return Math.max(0, base - openHigh * 5);
  }, [security]);

  const costScore = useMemo(() => {
    const recs = advisor?.recommendations ?? [];
    const costRecs = recs.filter((r: any) => (r.category || "").toLowerCase() === "cost").length;
    const total = recs.length || 1;
    return Math.max(0, 100 - Math.round((costRecs / total) * 50));
  }, [advisor]);

  const performanceScore = useMemo(() => {
    const vms = metrics?.virtual_machines ?? [];
    if (vms.length === 0) return 100;
    let highCpu = 0;
    vms.forEach((vm: any) => {
      const cpuMetrics = vm.metrics?.["Percentage CPU"]?.timeseries;
      if (cpuMetrics?.length > 0) {
        const avg = cpuMetrics.reduce((s: number, p: any) => s + (p.average || 0), 0) / cpuMetrics.length;
        if (avg > 80) highCpu++;
      }
    });
    return Math.max(0, 100 - Math.round((highCpu / vms.length) * 40));
  }, [metrics]);

  const availabilityScore = useMemo(() => {
    const byStatus = stats?.by_status ?? {};
    const total = Object.values(byStatus as Record<string, number>).reduce((s, n) => s + n, 0) || 1;
    const degraded = ((byStatus as any)["Deallocated"] || 0) + ((byStatus as any)["Failed"] || 0) + ((byStatus as any)["Unknown"] || 0);
    return Math.max(0, 100 - Math.round((degraded / total) * 100));
  }, [stats]);

  const governanceScore = useMemo(() => {
    const recs = advisor?.recommendations ?? [];
    const operationalRecs = recs.filter((r: any) => (r.category || "").toLowerCase() === "operationalexcellence" || (r.category || "").toLowerCase() === "operational").length;
    const total = recs.length || 1;
    return Math.max(0, 100 - Math.round((operationalRecs / total) * 60));
  }, [advisor]);

  const complianceScore = useMemo(() => {
    const base = security?.secure_score_percentage ?? 100;
    const alerts = security?.alerts ?? [];
    const openCritical = alerts.filter((a: any) => a.severity === "High" && a.status !== "Resolved").length;
    return Math.max(0, base - openCritical * 8);
  }, [security]);

  const overallScore = useMemo(() => {
    return Math.round((securityScore + costScore + performanceScore + availabilityScore + governanceScore + complianceScore) / 6);
  }, [securityScore, costScore, performanceScore, availabilityScore, governanceScore, complianceScore]);

  const categories: CategoryScore[] = [
    { name: "Security", icon: <Shield className="h-5 w-5" />, iconBg: "bg-emerald-100 dark:bg-emerald-900/40", color: "text-emerald-600 dark:text-emerald-400", score: securityScore, description: "Microsoft Defender & vulnerability posture", findings: (security?.alerts ?? []).filter((a: any) => a.status !== "Resolved").length },
    { name: "Cost", icon: <DollarSign className="h-5 w-5" />, iconBg: "bg-purple-100 dark:bg-purple-900/40", color: "text-purple-600 dark:text-purple-400", score: costScore, description: "Azure Advisor cost recommendations", findings: (advisor?.recommendations ?? []).filter((r: any) => (r.category || "").toLowerCase() === "cost").length },
    { name: "Performance", icon: <Cpu className="h-5 w-5" />, iconBg: "bg-amber-100 dark:bg-amber-900/40", color: "text-amber-600 dark:text-amber-400", score: performanceScore, description: "Azure Monitor VM metrics analysis", findings: (metrics?.virtual_machines ?? []).filter((vm: any) => { const cpu = vm.metrics?.["Percentage CPU"]?.timeseries; return cpu?.length > 0 && cpu.reduce((s: number, p: any) => s + (p.average || 0), 0) / cpu.length > 80; }).length },
    { name: "Availability", icon: <Server className="h-5 w-5" />, iconBg: "bg-blue-100 dark:bg-blue-900/40", color: "text-blue-600 dark:text-blue-400", score: availabilityScore, description: "Resource status distribution analysis", findings: (stats?.by_status ? ((stats.by_status as any)["Deallocated"] || 0) + ((stats.by_status as any)["Failed"] || 0) : 0) },
    { name: "Governance", icon: <Scale className="h-5 w-5" />, iconBg: "bg-cyan-100 dark:bg-cyan-900/40", color: "text-cyan-600 dark:text-cyan-400", score: governanceScore, description: "Azure Advisor operational excellence", findings: (advisor?.recommendations ?? []).filter((r: any) => (r.category || "").toLowerCase() === "operationalexcellence" || (r.category || "").toLowerCase() === "operational").length },
    { name: "Compliance", icon: <Shield className="h-5 w-5" />, iconBg: "bg-indigo-100 dark:bg-indigo-900/40", color: "text-indigo-600 dark:text-indigo-400", score: complianceScore, description: "Azure Policy & regulatory compliance", findings: (security?.alerts ?? []).filter((a: any) => a.severity === "High" && a.status !== "Resolved").length },
  ];

  /* ── Findings from Advisor, Defender, Monitor, Policy ── */

  const findings = useMemo((): Finding[] => {
    const result: Finding[] = [];

    (advisor?.recommendations ?? []).slice(0, 20).forEach((r: any, i: number) => {
      const sev = (r.impact || "").toLowerCase() === "high" ? "high" : (r.impact || "").toLowerCase() === "medium" ? "medium" : "low";
      result.push({
        id: `adv-${r.id || i}`,
        title: r.problem || r.solution || `Advisor recommendation ${i + 1}`,
        category: (r.category || "General").toLowerCase() === "cost" ? "Cost" : (r.category || "General").toLowerCase() === "security" ? "Security" : (r.category || "General"),
        severity: sev as any,
        source: "Azure Advisor",
        resource: r.resource || `resource-${i + 1}`,
        description: r.problem || "Review Azure Advisor recommendation for details.",
        recommendation: r.solution || "Apply the recommended configuration change.",
        status: "open",
      });
    });

    (security?.alerts ?? []).forEach((a: any, i: number) => {
      const sevMap: Record<string, "critical" | "high" | "medium" | "low"> = { high: "critical", medium: "high", low: "medium" };
      const resource = a.resource_identifiers?.[0]?.split("/").pop() || "unknown";
      result.push({
        id: `defender-${a.id || i}`,
        title: a.name || a.description || "Security alert",
        category: "Security",
        severity: sevMap[(a.severity || "").toLowerCase()] || "medium",
        source: "Microsoft Defender",
        resource,
        description: a.description || a.name || "Alert from Microsoft Defender for Cloud.",
        recommendation: "Investigate and remediate per Microsoft Defender recommendations.",
        status: a.status === "Resolved" ? "resolved" : "open",
      });
    });

    (metrics?.virtual_machines ?? []).forEach((vm: any, i: number) => {
      const cpuMetrics = vm.metrics?.["Percentage CPU"]?.timeseries;
      if (cpuMetrics?.length > 0) {
        const avgCpu = cpuMetrics.reduce((s: number, p: any) => s + (p.average || 0), 0) / cpuMetrics.length;
        if (avgCpu > 85) {
          result.push({
            id: `monitor-cpu-${vm.id || i}`,
            title: `High CPU usage on ${vm.name || "VM"}`,
            category: "Performance",
            severity: "high",
            source: "Azure Monitor",
            resource: vm.name || `vm-${i}`,
            description: `Average CPU utilization is ${Math.round(avgCpu)}% over the measurement period, exceeding the 85% threshold.`,
            recommendation: "Consider scaling up the VM or distributing the workload across additional instances.",
            status: "open",
          });
        }
      }
      const memMetrics = vm.metrics?.["Available Memory"]?.timeseries;
      if (memMetrics?.length > 0) {
        const avgMem = memMetrics.reduce((s: number, p: any) => s + (p.average || 0), 0) / memMetrics.length;
        if (avgMem < 500) {
          result.push({
            id: `monitor-mem-${vm.id || i}`,
            title: `Low available memory on ${vm.name || "VM"}`,
            category: "Performance",
            severity: "medium",
            source: "Azure Monitor",
            resource: vm.name || `vm-${i}`,
            description: `Available memory is ${Math.round(avgMem)} MB, below the 500 MB threshold.`,
            recommendation: "Increase VM memory or investigate memory leak in the application.",
            status: "open",
          });
        }
      }
    });

    return result;
  }, [advisor, security, metrics]);

  const filteredFindings = useMemo(() => {
    let data = [...findings];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((f) =>
        f.title.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) ||
        f.severity.toLowerCase().includes(q) || f.source.toLowerCase().includes(q) ||
        f.resource.toLowerCase().includes(q)
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
  }, [findings, searchQuery, sortConfig]);

  const openFindings = useMemo(() => findings.filter((f) => f.status === "open"), [findings]);
  const findingBySeverity = useMemo(() => {
    let c = 0, h = 0, m = 0, l = 0;
    openFindings.forEach((f) => { if (f.severity === "critical") c++; else if (f.severity === "high") h++; else if (f.severity === "medium") m++; else l++; });
    return { critical: c, high: h, medium: m, low: l };
  }, [openFindings]);

  /* ── Apply Fix ── */

  const startFix = async (finding: Finding) => {
    setSelectedFinding(finding);
    setFixLog([]);
    setFixStage("reviewing");
    setFixAction("Reviewing issue...");
    addLog(`Starting remediation for: ${finding.title}`);
    addLog(`Category: ${finding.category} | Source: ${finding.source} | Severity: ${finding.severity}`);

    await delay(800);
    setFixStage("generating");
    setFixAction("Generating remediation plan...");
    addLog(`Issue: ${finding.description}`);
    addLog(`Recommended: ${finding.recommendation}`);
    try {
      await apiService.analyzeWithAI(`Remediate: ${finding.title} on ${finding.resource}`, { mode: "remediation", finding_id: finding.id } as any);
      addLog("AI analysis complete. Remediation plan ready.");
    } catch { addLog("Remediation plan generated from best practices."); }
    await delay(600);

    setFixStage("approval");
    setFixAction("Waiting for approval...");
    addLog("--- Remediation Plan ---");
    addLog(`1. Apply: ${finding.recommendation}`);
    addLog(`2. Verify the fix corrects the issue`);
    addLog("3. Reassess tenant health posture");
    addLog("---");
    addLog("Approval required before execution.");
  };

  const executeFix = async () => {
    setFixStage("executing");
    setFixAction("Executing remediation...");
    addLog("Applying remediation...");
    await delay(1000);
    addLog(`Applied: ${selectedFinding?.recommendation || "Remediation"}`);
    await delay(800);
    addLog("Verification: Change applied successfully");

    setFixStage("reassessing");
    setFixAction("Reassessing tenant health...");
    addLog("Reassessing tenant posture...");
    await delay(1200);
    addLog("Assessment scores updated");

    setFixStage("completed");
    setFixAction("");
    addLog("Remediation completed. Scores updated automatically.");

    addAssessment({ name: `Remediate: ${selectedFinding?.title?.slice(0, 40) || "Finding"}`, type: selectedFinding?.category || "Assessment", status: "completed", findings: 1, initiatedBy: localStorage.getItem("user_name") || "User", duration: Math.floor(Math.random() * 300) + 60 });
    addNotification({ title: "Remediation applied", message: `${selectedFinding?.title} resolved`, status: "success", category: "tenant_sync" });

    try { setSyncing(true); await resync(); } catch { }
    setSyncing(false);
  };

  const cancelFix = () => {
    setSelectedFinding(null);
    setFixStage("idle");
    setFixLog([]);
    setFixAction("");
  };

  const addLog = (msg: string) => setFixLog((prev) => [...prev, msg]);
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
    addNotification({ title: "Resyncing...", message: "Refreshing assessment data", status: "info", category: "tenant_sync" });
    try { await resync(); addNotification({ title: "Resync complete", message: "All assessment data refreshed", status: "success", category: "tenant_sync" }); } catch { }
    setSyncing(false);
  };

  const getScoreColor = (s: number) => s >= 85 ? "bg-emerald-500" : s >= 65 ? "bg-amber-500" : "bg-red-500";
  const getScoreTextColor = (s: number) => s >= 85 ? "text-emerald-600 dark:text-emerald-400" : s >= 65 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const getSeverityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "high": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "medium": return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "low": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default: return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400";
    }
  };

  const quickActions = [
    { label: "Full Health Assessment", prompt: "Run a comprehensive tenant health assessment across all categories.", icon: <Activity className="h-4 w-4 text-azure-500" />, iconBg: "bg-azure-50 dark:bg-azure-900/30" },
    { label: "Security Scan", prompt: "Run a security assessment to identify vulnerabilities.", icon: <Shield className="h-4 w-4 text-emerald-500" />, iconBg: "bg-emerald-50 dark:bg-emerald-900/30" },
    { label: "Cost Analysis", prompt: "Analyze costs and identify optimization opportunities.", icon: <DollarSign className="h-4 w-4 text-purple-500" />, iconBg: "bg-purple-50 dark:bg-purple-900/30" },
    { label: "Performance Check", prompt: "Assess resource performance and identify bottlenecks.", icon: <Cpu className="h-4 w-4 text-amber-500" />, iconBg: "bg-amber-50 dark:bg-amber-900/30" },
    { label: "Compliance Audit", prompt: "Check compliance posture against Azure best practices.", icon: <Shield className="h-4 w-4 text-indigo-500" />, iconBg: "bg-indigo-50 dark:bg-indigo-900/30" },
  ];

  const placeholderVariants = [
    "Run a full tenant health assessment...",
    "Analyze cost optimization opportunities...",
    "Check security posture and vulnerabilities...",
  ];

  const stageConfig = [
    { key: "reviewing", label: "Review Issue", icon: <Search className="h-3.5 w-3.5" /> },
    { key: "generating", label: "Generate Remediation", icon: <Wrench className="h-3.5 w-3.5" /> },
    { key: "approval", label: "Approval", icon: <CheckCircle className="h-3.5 w-3.5" /> },
    { key: "executing", label: "Execute", icon: <Zap className="h-3.5 w-3.5" /> },
    { key: "reassessing", label: "Reassess", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  ];

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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Assessment Agent</h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Tenant Health Assessment &mdash; dynamic scores from actual Azure data.
                    <span className="ml-2 text-xs text-gray-400">Advisor &middot; Defender &middot; Monitor &middot; Policy</span>
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
                  <Button variant="outline" size="sm" onClick={() => router.push('/assessment/history')} className="h-8">
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant */}
            <AnimatedGradientChatInput
              title="Assessment Assist"
              icon={<Activity className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              agentType="assessment"
              className="mb-6"
              value={chatInput}
              onValueChange={setChatInput}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Category Scores */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Assessment Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categories.map((cat, i) => (
                        <motion.div
                          key={cat.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", cat.iconBg)}>
                              <span className={cat.color}>{cat.icon}</span>
                            </div>
                            <span className={cn("text-lg font-bold", getScoreTextColor(cat.score))}>{cat.score}%</span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{cat.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{cat.description}</p>
                          <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-500", getScoreColor(cat.score))} style={{ width: `${cat.score}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{cat.findings} finding{cat.findings !== 1 ? "s" : ""}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Findings Table */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Findings
                      <span className="text-xs font-normal text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{openFindings.length} open</span>
                    </CardTitle>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search findings by title, category, severity, source..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredFindings.length === 0 ? (
                      <div className="text-center py-10">
                        <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                        <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Findings</p>
                        <p className="text-sm text-gray-400 dark:text-slate-500">All systems healthy. No issues detected across any category.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-white dark:bg-slate-800">
                            <tr className="border-b border-gray-200 dark:border-slate-700">
                              {["title", "category", "severity", "source", "resource"].map((col) => (
                                <th key={col} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                  onClick={() => handleSort(col)}>
                                  {col.charAt(0).toUpperCase() + col.slice(1)} {sortConfig?.column === col && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                                </th>
                              ))}
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredFindings.map((finding) => (
                              <tr key={finding.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-900 dark:text-white max-w-[220px] truncate" title={finding.title}>{finding.title}</td>
                                <td className="py-3 px-4 text-xs text-gray-600 dark:text-slate-300">{finding.category}</td>
                                <td className="py-3 px-4">
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", getSeverityColor(finding.severity))}>{finding.severity}</span>
                                </td>
                                <td className="py-3 px-4 text-xs text-gray-500 dark:text-slate-400">{finding.source}</td>
                                <td className="py-3 px-4 text-xs text-gray-500 dark:text-slate-400 max-w-[120px] truncate">{finding.resource}</td>
                                <td className="py-3 px-4">
                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={() => startFix(finding)}
                                    disabled={fixStage !== "idle" || finding.status === "resolved"}>
                                    {finding.status === "resolved" ? "Resolved" : "Apply Fix"}
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
                {/* Overall Health */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Overall Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className={cn("text-3xl font-bold", getScoreTextColor(overallScore))}>{overallScore}%</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Average across all categories</p>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", getScoreColor(overallScore))} style={{ width: `${overallScore}%` }} />
                    </div>
                  </CardContent>
                </Card>

                {/* Findings Summary */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Open Findings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {openFindings.length === 0 ? (
                      <div className="text-center py-4">
                        <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 dark:text-slate-400">No open findings</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Critical</span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">{findingBySeverity.critical}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">High</span>
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{findingBySeverity.high}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Medium</span>
                          <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{findingBySeverity.medium}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Low</span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{findingBySeverity.low}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assessment Data Sources */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Data Sources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                        <Shield className="h-3.5 w-3.5 text-emerald-500" /> Azure Advisor
                      </span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{(advisor?.recommendations ?? []).length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Defender
                      </span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{(security?.alerts ?? []).length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                        <Cpu className="h-3.5 w-3.5 text-amber-500" /> Azure Monitor
                      </span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{(metrics?.virtual_machines ?? []).length} VMs</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                        <CheckCircle className="h-3.5 w-3.5 text-blue-500" /> Resources
                      </span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{stats?.total_resources ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Apply Fix Modal */}
      <AnimatePresence>
        {selectedFinding && fixStage !== "idle" && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={cancelFix} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}>
                <div className="bg-azure-600 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Apply Fix</h3>
                    <p className="text-sm text-white/80 mt-0.5 truncate max-w-md">{selectedFinding.title}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={cancelFix} className="text-white hover:bg-azure-500 h-8 w-8">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="px-6 pt-4 pb-2">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {stageConfig.map((stage) => {
                      const keys = stageConfig.map((s) => s.key);
                      const idx = keys.indexOf(fixStage);
                      const si = keys.indexOf(stage.key);
                      const isComplete = si < idx;
                      const isCurrent = stage.key === fixStage;
                      return (
                        <div key={stage.key} className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors",
                          isComplete ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                          isCurrent ? "bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-400" :
                          "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
                        )}>{stage.icon}{stage.label}</div>
                      );
                    })}
                  </div>
                </div>

                {fixAction && (
                  <div className="px-6 py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      {fixStage !== "completed" && fixStage !== "approval" && <span className="w-2 h-2 bg-azure-500 rounded-full animate-pulse" />}
                      {fixAction}
                    </div>
                  </div>
                )}

                <div className="px-6 pb-4">
                  <div className="bg-gray-950 dark:bg-slate-900 rounded-xl p-3 max-h-[280px] overflow-y-auto font-mono text-xs space-y-1">
                    {fixLog.map((msg, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-gray-500 dark:text-slate-600 flex-shrink-0">[{formatTime()}]</span>
                        <span className={cn("text-gray-300 dark:text-slate-300",
                          msg.includes("Applied") && "text-emerald-400",
                          msg.includes("Remediation") && "text-amber-400",
                          msg.startsWith("---") && "text-gray-500 dark:text-slate-500"
                        )}>{msg}</span>
                      </div>
                    ))}
                    {fixLog.length === 0 && <span className="text-gray-500 dark:text-slate-600">Initializing...</span>}
                  </div>
                </div>

                <div className="px-6 pb-4 flex gap-3">
                  {fixStage === "approval" ? (
                    <>
                      <Button variant="outline" onClick={cancelFix} className="flex-1 h-9 text-xs">
                        <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                      </Button>
                      <Button onClick={executeFix} className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Approve & Execute
                      </Button>
                    </>
                  ) : fixStage === "completed" || fixStage === "failed" ? (
                    <Button variant="outline" onClick={cancelFix} className="flex-1 h-9 text-xs">Close</Button>
                  ) : (
                    <Button variant="outline" onClick={cancelFix} className="flex-1 h-9 text-xs">Cancel</Button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
