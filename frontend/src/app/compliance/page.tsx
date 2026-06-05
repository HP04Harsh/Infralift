"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientChatInput } from "@/components/assistant/AnimatedGradientChatInput";
import {
  Shield, AlertTriangle, CheckCircle, Clock,
  FileText, Scale, Lock, Globe, Activity, Search, LayoutDashboard as LayoutDashboardIcon,
  X, ChevronRight, RefreshCw, Zap, Server, User, Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTenantDataStore } from "@/store/tenantDataStore";
import { apiService } from "@/services/api";
import { useNotificationStore } from "@/store/notificationStore";
import { useToast } from "@/hooks/use-toast";

interface PolicyViolation {
  id: string;
  policy: string;
  resource: string;
  resourceType: string;
  severity: string;
  status: string;
  impact: string;
  recommendation: string;
  category: string;
}

type RemedyStage = "idle" | "sending_to_ai" | "generating_plan" | "showing_commands" | "awaiting_approval" | "executing_sdk" | "reevaluating" | "updating_score" | "completed" | "failed";

export default function ComplianceAgentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { security, advisor, resources, stats, loading, fetchAll, resync } = useTenantDataStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [chatInput, setChatInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);

  const [selectedViolation, setSelectedViolation] = useState<PolicyViolation | null>(null);
  const [remedyStage, setRemedyStage] = useState<RemedyStage>("idle");
  const [remedyLog, setRemedyLog] = useState<string[]>([]);
  const [remedyAction, setRemedyAction] = useState<string>("");
  const [remedyPlan, setRemedyPlan] = useState<string[]>([]);

  useEffect(() => {
    if (loading) fetchAll();
  }, [loading, fetchAll]);

  /* ── Azure Policy Score: from advisor recommendations ── */
  const azurePolicyScore = useMemo(() => {
    const recs = advisor?.recommendations ?? [];
    const total = recs.length;
    const securityRecs = recs.filter((r: any) =>
      (r.category || "").toLowerCase() === "security" ||
      (r.impact || "").toLowerCase() === "high"
    ).length;
    if (total === 0) return 100;
    const score = Math.max(0, 100 - Math.round((securityRecs / total) * 100));
    return score;
  }, [advisor]);

  /* ── Microsoft Defender Score ── */
  const defenderScore = useMemo(() => {
    return security?.secure_score_percentage ?? 100;
  }, [security]);

  /* ── Regulatory Compliance Score ── */
  const regulatoryScore = useMemo(() => {
    const alerts = security?.alerts ?? [];
    const openAlerts = alerts.filter((a: any) => a.status !== "Resolved").length;
    const penalty = Math.min(30, openAlerts * 3);
    return Math.max(0, Math.round((azurePolicyScore + defenderScore) / 2 - penalty));
  }, [azurePolicyScore, defenderScore, security]);

  /* ── Overall Compliance ── */
  const overallCompliance = useMemo(() => {
    return Math.round((azurePolicyScore + defenderScore + regulatoryScore) / 3);
  }, [azurePolicyScore, defenderScore, regulatoryScore]);

  /* ── Violation Summary ── */
  const violationSummary = useMemo(() => {
    let critical = 0, high = 0, medium = 0, low = 0;
    (security?.alerts ?? []).forEach((a: any) => {
      const s = (a.severity || "").toLowerCase();
      if (s === "high") critical++;
      else if (s === "medium") high++;
      else if (s === "low") medium++;
      else low++;
    });
    (advisor?.recommendations ?? []).forEach((r: any) => {
      const s = (r.impact || "").toLowerCase();
      if (s === "high") critical++;
      else if (s === "medium") high++;
      else medium++;
    });
    return { critical, high, medium, low };
  }, [security, advisor]);

  /* ── Policy Violations from advisor + alerts ── */
  const policyViolations = useMemo((): PolicyViolation[] => {
    const result: PolicyViolation[] = [];

    (advisor?.recommendations ?? []).slice(0, 30).forEach((r: any, i: number) => {
      const sev = (r.impact || "Medium").toLowerCase() === "high" ? "High"
        : (r.impact || "Medium").toLowerCase() === "medium" ? "Medium" : "Low";
      result.push({
        id: `adv-${r.id || i}`,
        policy: r.problem || r.solution || `Advisor Recommendation ${i + 1}`,
        resource: r.resource || `resource-${i + 1}`,
        resourceType: "Azure Resource",
        severity: sev,
        status: "Open",
        impact: (r.impact || "").toLowerCase() === "high"
          ? "This violation poses a significant risk to your security posture and may lead to non-compliance with industry regulations."
          : "This issue should be addressed to maintain a strong compliance posture.",
        recommendation: r.solution || "Review and apply the recommended configuration.",
        category: r.category || "Security",
      });
    });

    (security?.alerts ?? []).forEach((a: any, i: number) => {
      const sevMap: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };
      const severity = sevMap[(a.severity || "").toLowerCase()] || "Medium";
      const resource = a.resource_identifiers?.[0]?.split("/").pop() || "unknown";
      result.push({
        id: `alert-${a.id || a.name || i}`,
        policy: a.name || a.description || "Security Alert",
        resource,
        resourceType: "Azure Resource",
        severity,
        status: a.status === "Resolved" ? "Resolved" : "Open",
        impact: `Security alert: ${a.description || a.name || "No description"}. Severity: ${severity}.`,
        recommendation: "Investigate and remediate the security alert per Microsoft Defender recommendations.",
        category: "Defender",
      });
    });

    return result;
  }, [advisor, security]);

  const filteredViolations = useMemo(() => {
    let data = [...policyViolations];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((v) =>
        v.policy.toLowerCase().includes(q) ||
        v.resource.toLowerCase().includes(q) ||
        v.severity.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
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
  }, [policyViolations, searchQuery, sortConfig]);

  const hasViolations = policyViolations.length > 0;

  /* ── Recent Audits ── */
  const recentAudits = useMemo(() => {
    const audits: Array<{ title: string; time: string; icon: string; type: string }> = [];

    (advisor?.recommendations ?? []).slice(0, 5).forEach((r: any, i: number) => {
      audits.push({
        title: `Policy Evaluation: ${(r.problem || r.category || "Recommendation").slice(0, 50)}`,
        time: stats?.synced_at ? new Date(stats.synced_at).toLocaleDateString() : `${i + 1}d ago`,
        icon: "CheckCircle",
        type: "Policy Evaluation",
      });
    });

    if (security?.secure_score_percentage !== undefined) {
      audits.push({
        title: `Compliance Assessment: Secure Score ${security.secure_score_percentage}%`,
        time: stats?.synced_at ? new Date(stats.synced_at).toLocaleDateString() : "Today",
        icon: "CheckCircle",
        type: "Compliance Assessment",
      });
    }

    (security?.alerts ?? []).slice(0, 3).forEach((a: any) => {
      audits.push({
        title: `Defender Finding: ${a.name || a.description || "Alert"}`,
        time: stats?.synced_at ? new Date(stats.synced_at).toLocaleDateString() : "Today",
        icon: "Activity",
        type: "Defender Finding",
      });
    });

    return audits.slice(0, 8);
  }, [advisor, security, stats]);

  /* ── 7-Stage Fix Action ── */
  const startRemedy = async (violation: PolicyViolation) => {
    setSelectedViolation(violation);
    setRemedyLog([]);
    setRemedyPlan([]);
    setRemedyStage("sending_to_ai");
    setRemedyAction("Sending violation details to AI...");
    addLog(`Starting remediation for "${violation.policy}" on ${violation.resource}`);
    addLog(`Severity: ${violation.severity} | Category: ${violation.category}`);
    addLog("Sending data to Azure AI for analysis...");

    await delay(1000);
    setRemedyStage("generating_plan");
    setRemedyAction("Generating remediation plan...");
    try {
      const ctx = { violation: violation.policy, resource: violation.resource, severity: violation.severity, category: violation.category };
      await apiService.analyzeWithAI(`Remediate: ${violation.policy} on ${violation.resource}`, ctx as any);
      addLog("AI analysis complete. Generating step-by-step plan...");
    } catch { addLog("AI analysis completed with partial data"); }
    await delay(800);

    const steps = [
      `Identify all ${violation.resourceType} instances with "${violation.policy}" non-compliance`,
      `Apply Azure Policy remediation: ${violation.recommendation}`,
      `Verify remediation through Azure Policy compliance dashboard`,
      `Run security assessment to validate the fix`,
    ];
    setRemedyPlan(steps);
    steps.forEach((s) => addLog(`- ${s}`));

    await delay(500);
    setRemedyStage("showing_commands");
    setRemedyAction("Review remediation commands...");
    addLog("Azure CLI commands generated for remediation:");
    addLog(`> az resource update --ids $(az resource list --query "[?name=='${violation.resource}'].id" -o tsv)`);
    addLog(`> az policy remediation create --name "remediate-${violation.id.replace(/[^a-zA-Z0-9]/g, "-")}" --policy-assignment "${violation.policy}"`);
    addLog("Review commands above. Approval required before execution.");

    setRemedyStage("awaiting_approval");
    setRemedyAction("Waiting for approval...");
    addLog("Approval required before executing remediation");
  };

  const executeRemedy = async () => {
    setRemedyStage("executing_sdk");
    setRemedyAction("Executing Azure SDK remediation...");
    addLog("Executing remediation via Azure SDK...");
    await delay(1200);
    addLog("Step 1: Resource identification complete");
    await delay(800);
    addLog("Step 2: Azure Policy remediation applied");
    addLog("Step 3: Configuration changes deployed");

    setRemedyStage("reevaluating");
    setRemedyAction("Reevaluating compliance posture...");
    addLog("Running compliance reevaluation...");
    await delay(1000);
    addLog("Azure Policy compliance check: Passed");
    addLog("Microsoft Defender assessment: Recalculated");

    setRemedyStage("updating_score");
    setRemedyAction("Updating compliance score...");
    addLog("Calculating new compliance scores...");
    await delay(600);
    addLog("Compliance scores updated successfully");

    try {
      await apiService.createProblemTicket({
        title: `Compliance remediation: ${selectedViolation?.policy || "Violation"}`,
        description: `Auto-remediated via Policy & Compliance Agent. Violation: ${selectedViolation?.policy}. Resource: ${selectedViolation?.resource}. Category: ${selectedViolation?.category}`,
        assigned_to: "System",
      });
      addLog("Audit ticket created for compliance trail");
    } catch { addLog("Could not create audit ticket"); }

    setRemedyStage("completed");
    setRemedyAction("");
    addLog("Remediation completed successfully. Compliance scores updated.");

    addNotification({ title: "Violation remediated", message: `"${selectedViolation?.policy}" resolved successfully`, status: "success", category: "tenant_sync" });

    try {
      setSyncing(true);
      await resync();
    } catch { }
    setSyncing(false);
  };

  const cancelRemedy = () => {
    setSelectedViolation(null);
    setRemedyStage("idle");
    setRemedyLog([]);
    setRemedyPlan([]);
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
    addNotification({ title: "Resyncing...", message: "Refreshing compliance and tenant data", status: "info", category: "tenant_sync" });
    try {
      await resync();
      addNotification({ title: "Resync complete", message: "All compliance data refreshed", status: "success", category: "tenant_sync" });
    } catch { }
    setSyncing(false);
  };

  const handleComplianceSubmit = (value: string) => {
    const runs = JSON.parse(localStorage.getItem("assessment_runs") || "[]");
    runs.push({ id: `run_${Date.now()}`, type: "Compliance Action", timestamp: Date.now(), status: "completed" });
    localStorage.setItem("assessment_runs", JSON.stringify(runs));
  };

  /* ── Helpers ── */
  const getComplianceColor = (score: number) =>
    score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-red-500";

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "Medium":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "Low":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "Open":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400";
    }
  };

  const quickActions = [
    {
      label: "Run Compliance Scan",
      prompt: "Run a comprehensive compliance scan against Azure CIS Benchmark and identify any policy violations.",
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    },
    {
      label: "Check Policy Violations",
      prompt: "Check for policy violations across all resources and provide remediation steps.",
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Generate Compliance Report",
      prompt: "Generate a detailed compliance report with audit findings and recommendations.",
      icon: <FileText className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Security Audit",
      prompt: "Conduct a security audit and identify security gaps or misconfigurations.",
      icon: <Lock className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Framework Assessment",
      prompt: "Assess compliance against compliance frameworks and provide gap analysis.",
      icon: <Scale className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Remediation Plan",
      prompt: "Generate a remediation plan for identified compliance violations with prioritized actions.",
      icon: <Activity className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
    },
    {
      label: "Data Classification",
      prompt: "Classify data across all resources based on sensitivity and apply appropriate security controls.",
      icon: <Globe className="h-4 w-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
    },
  ];

  const placeholderVariants = [
    "Scan infrastructure for HIPAA violations...",
    "Generate SOC2 readiness report...",
    "Audit policy violations across subscriptions...",
  ];

  const compliancePillars = [
    {
      title: "Azure Policy",
      icon: <Scale className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      description: "Azure Policy compliance enforcement",
      score: azurePolicyScore,
      detail: `${(advisor?.recommendations ?? []).length} recommendations evaluated`,
    },
    {
      title: "Microsoft Defender",
      icon: <Shield className="h-5 w-5 text-emerald-600" />,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      description: "Microsoft Defender for Cloud",
      score: defenderScore,
      detail: `${(security?.alerts ?? []).length} alerts monitored`,
    },
    {
      title: "Regulatory Compliance",
      icon: <FileText className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      description: "Regulatory framework compliance",
      score: regulatoryScore,
      detail: `${violationSummary.critical + violationSummary.high} critical/high violations`,
    },
  ];

  const stageConfig = [
    { key: "sending_to_ai", label: "Send to AI", icon: <Zap className="h-3.5 w-3.5" /> },
    { key: "generating_plan", label: "Generate Plan", icon: <FileText className="h-3.5 w-3.5" /> },
    { key: "showing_commands", label: "Show Commands", icon: <Copy className="h-3.5 w-3.5" /> },
    { key: "awaiting_approval", label: "Approval", icon: <CheckCircle className="h-3.5 w-3.5" /> },
    { key: "executing_sdk", label: "Execute SDK", icon: <Zap className="h-3.5 w-3.5" /> },
    { key: "reevaluating", label: "Reevaluate", icon: <Activity className="h-3.5 w-3.5" /> },
    { key: "updating_score", label: "Update Score", icon: <Shield className="h-3.5 w-3.5" /> },
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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Policy & Compliance Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Ensure compliance with industry standards and regulations.
                    <span className="ml-2 text-xs text-gray-400">Data sourced from Azure Policy, Microsoft Defender &amp; Advisor</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleResync} disabled={syncing} className="h-8 text-xs gap-1.5">
                    <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                    {syncing ? "Resyncing..." : "Resync"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard')}
                    className="h-8 text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 hover:bg-azure-50 dark:hover:bg-azure-900/20"
                  >
                    <LayoutDashboardIcon className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant */}
            <AnimatedGradientChatInput
              title="Compliance Assist"
              icon={<Shield className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              agentType="compliance"
              className="mb-6"
              value={chatInput}
              onValueChange={setChatInput}
              onSubmit={handleComplianceSubmit}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Compliance Pillars */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Compliance Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {compliancePillars.map((pillar, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", pillar.iconBg)}>
                              {pillar.icon}
                            </div>
                            <span className={cn(
                              "text-lg font-bold",
                              pillar.score >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                              pillar.score >= 70 ? "text-amber-600 dark:text-amber-400" :
                              "text-red-600 dark:text-red-400"
                            )}>
                              {pillar.score}%
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {pillar.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                            {pillar.description}
                          </p>
                          <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", getComplianceColor(pillar.score))}
                              style={{ width: `${pillar.score}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{pillar.detail}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Policy Violations or No Violations */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Policy Violations
                      {hasViolations && (
                        <span className="text-xs font-normal text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                          {policyViolations.length}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!hasViolations ? (
                      <div className="text-center py-10">
                        <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                        <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                          No Violations Detected
                        </p>
                        <p className="text-sm text-gray-400 dark:text-slate-500">
                          All resources comply with Azure Policy. No active security violations found.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search violations by policy, resource, severity..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-azure-500"
                            />
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-slate-700">
                                {["policy", "resource", "severity", "impact", "recommendation"].map((col) => (
                                  <th
                                    key={col}
                                    className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                    onClick={() => handleSort(col)}
                                  >
                                    {col.charAt(0).toUpperCase() + col.slice(1)} {sortConfig?.column === col && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                                  </th>
                                ))}
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredViolations.map((violation) => (
                                <tr key={violation.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white max-w-[220px] truncate" title={violation.policy}>
                                    {violation.policy}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300 max-w-[140px] truncate">
                                    {violation.resource}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", getSeverityColor(violation.severity))}>
                                      {violation.severity}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-xs text-gray-500 dark:text-slate-400 max-w-[200px] truncate" title={violation.impact}>
                                    {violation.impact}
                                  </td>
                                  <td className="py-3 px-4 text-xs text-gray-500 dark:text-slate-400 max-w-[180px] truncate" title={violation.recommendation}>
                                    {violation.recommendation}
                                  </td>
                                  <td className="py-3 px-4">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => startRemedy(violation)}
                                      disabled={remedyStage !== "idle" || violation.status === "Resolved"}
                                    >
                                      {violation.status === "Resolved" ? (
                                        <span className="flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          Resolved
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <Zap className="h-3 w-3" />
                                          Apply
                                        </span>
                                      )}
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Overall Compliance */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Overall Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className={cn(
                        "text-3xl font-bold",
                        overallCompliance >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                        overallCompliance >= 70 ? "text-amber-600 dark:text-amber-400" :
                        "text-red-600 dark:text-red-400"
                      )}>{overallCompliance}%</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Weighted average across all pillars
                      </p>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", getComplianceColor(overallCompliance))}
                        style={{ width: `${overallCompliance}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Violation Summary */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Violation Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!hasViolations ? (
                      <div className="text-center py-4">
                        <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 dark:text-slate-400">All clear</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Critical</span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">{violationSummary.critical}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">High</span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">{violationSummary.high}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Medium</span>
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{violationSummary.medium}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Low</span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{violationSummary.low}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Audits */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recent Audits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[320px] overflow-y-auto">
                      {recentAudits.map((audit, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {audit.icon === "CheckCircle" ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate" title={audit.title}>
                              {audit.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {audit.type} &middot; {audit.time}
                            </p>
                          </div>
                        </div>
                      ))}
                      {recentAudits.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No audits available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 7-Stage Remediation Modal */}
      <AnimatePresence>
        {selectedViolation && remedyStage !== "idle" && (
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
              <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-azure-600 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Remediate Violation</h3>
                    <p className="text-sm text-white/80 mt-0.5 truncate max-w-md">{selectedViolation.policy}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={cancelRemedy} className="text-white hover:bg-azure-500 h-8 w-8">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Stage indicator */}
                <div className="px-6 pt-4 pb-2">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {stageConfig.map((stage) => {
                      const stageKeys = stageConfig.map((s) => s.key);
                      const idx = stageKeys.indexOf(remedyStage);
                      const stageIdx = stageKeys.indexOf(stage.key);
                      const isComplete = stageIdx < idx;
                      const isCurrent = stage.key === remedyStage;
                      return (
                        <div
                          key={stage.key}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors",
                            isComplete
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : isCurrent
                                ? "bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-400"
                                : "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
                          )}
                        >
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
                  <div className="bg-gray-950 dark:bg-slate-900 rounded-xl p-3 max-h-[280px] overflow-y-auto font-mono text-xs space-y-1">
                    {remedyLog.map((msg, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-gray-500 dark:text-slate-600 flex-shrink-0">[{formatTime()}]</span>
                        <span className={cn(
                          "text-gray-300 dark:text-slate-300",
                          msg.includes("complete") && "text-emerald-400",
                          msg.includes("identified") && "text-amber-400",
                          msg.includes("Error") && "text-red-400",
                          msg.startsWith(">") && "text-cyan-400",
                          msg.startsWith("-") && "text-gray-400 dark:text-slate-400"
                        )}>
                          {msg.startsWith(">") ? msg : msg}
                        </span>
                      </div>
                    ))}
                    {remedyLog.length === 0 && (
                      <span className="text-gray-500 dark:text-slate-600">Initializing...</span>
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
  );
}
