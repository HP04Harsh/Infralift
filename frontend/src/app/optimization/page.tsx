"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientChatInput } from "@/components/assistant/AnimatedGradientChatInput";
import {
  DollarSign, TrendingDown, Server, Database,
  Clock, Zap, Layers, Target, PiggyBank, Wallet, LayoutDashboard as LayoutDashboardIcon, CheckCircle,
  XCircle, AlertTriangle, RefreshCw, BarChart3, Globe, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTenantDataStore } from "@/store/tenantDataStore";
import { apiService } from "@/services/api";
import { useNotificationStore } from "@/store/notificationStore";
import { useSettingsStore } from "@/store/settingsStore";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", INR: "₹", EUR: "€", GBP: "£", AED: "د.إ", JPY: "¥", CAD: "C$", AUD: "A$", BRL: "R$", SGD: "S$", HKD: "HK$", KRW: "₩", CHF: "Fr",
};

const BUDGET_STORAGE_KEY = "infralift_budget_amount";

function formatCurrency(amount: number, currency: string): string {
  if (!currency) return "Currency unavailable";
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

function formatMonthly(amount: number, currency: string): string {
  return `${formatCurrency(amount, currency)}/mo`;
}

export default function OptimizationAgentPage() {
  const router = useRouter();
  const [chatInput, setChatInput] = useState("");
  const { costs, advisor, resources, loading, fetchAll, resync } = useTenantDataStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [budgetAmount, setBudgetAmount] = useState<number | null>(null);
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState("");
  const [recStates, setRecStates] = useState<Record<number, "pending" | "validating" | "planning" | "awaiting_approval" | "executing" | "completed" | "failed">>({});
  const [showApprovalDialog, setShowApprovalDialog] = useState<number | null>(null);

  useEffect(() => {
    if (loading) fetchAll();
  }, [loading, fetchAll]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(BUDGET_STORAGE_KEY) : null;
    if (stored) {
      const val = parseFloat(stored);
      if (!isNaN(val) && val > 0) setBudgetAmount(val);
    }
  }, []);

  const currency = costs?.currency || "";
  const currencySymbol = currency ? (CURRENCY_SYMBOLS[currency] ?? currency + " ") : "";

  /* ── Real cost data ── */
  const mtd = costs?.month_to_date ?? 0;
  const forecast = costs?.forecast ?? mtd;
  const costByService: Record<string, number> = (costs?.cost_by_service as Record<string, number>) ?? {};
  const totalSvcCost = Object.values(costByService).reduce((s, v) => s + v, 0);

  const advisorRecs = advisor?.recommendations ?? [];
  const advisorCount = advisor?.count ?? advisorRecs.length;

  /* ── Budget ── */
  const budgetConfigured = budgetAmount != null && budgetAmount > 0;
  const budgetUsed = budgetConfigured ? Math.round((mtd / budgetAmount) * 100) : 0;
  const budgetRemaining = budgetConfigured ? Math.max(budgetAmount - Math.round(forecast), 0) : 0;

  const saveBudget = () => {
    const val = parseFloat(budgetInputValue);
    if (!isNaN(val) && val > 0) {
      setBudgetAmount(val);
      localStorage.setItem(BUDGET_STORAGE_KEY, val.toString());
      setShowBudgetInput(false);
      setBudgetInputValue("");
      addNotification({ title: "Budget set", message: `Monthly budget set to ${formatCurrency(val, currency)}`, status: "success", category: "tenant_sync" });
    }
  };

  const clearBudget = () => {
    setBudgetAmount(null);
    localStorage.removeItem(BUDGET_STORAGE_KEY);
    setShowBudgetInput(false);
    addNotification({ title: "Budget cleared", message: "Monthly budget has been removed", status: "info", category: "tenant_sync" });
  };

  /* ── Potential savings from real Advisor data ── */
  const potentialSavings = useMemo(() => {
    const costRecs = advisorRecs.filter((r: any) => (r.category || "").toLowerCase() === "cost");
    const actualSavings = costRecs
      .map((r: any) => Number(r.potentialSavings ?? r.estimatedSavings ?? 0))
      .filter((v: number) => v > 0);
    if (actualSavings.length > 0) {
      const total = Math.round(actualSavings.reduce((s: number, v: number) => s + v, 0));
      const byCategory: Record<string, number> = {};
      costRecs.forEach((r: any) => {
        const sv = Number(r.potentialSavings ?? r.estimatedSavings ?? 0);
        if (sv > 0) {
          const label = r.subCategory || r.category || "Other";
          byCategory[label] = (byCategory[label] || 0) + Math.round(sv);
        }
      });
      const breakdown = Object.entries(byCategory).length > 0
        ? Object.entries(byCategory).map(([label, value]) => ({ label, value }))
        : [{ label: "Cost Recommendations", value: total }];
      return { total, breakdown };
    }
    return { total: 0, breakdown: [] };
  }, [advisorRecs]);

  /* ── Advisor-based recommendations ── */
  const recommendations = useMemo(() => {
    if (advisorRecs.length === 0) {
      return [];
    }
    return advisorRecs.slice(0, 10).map((rec: any, i: number) => {
      const cat = (rec.category || "").toLowerCase();
      const imp = rec.impact || "Low";
      const actualSavings = Number(rec.potentialSavings ?? rec.estimatedSavings ?? 0);
      const savingsDisplay = actualSavings > 0 ? formatMonthly(actualSavings, currency) : "N/A";
      const effort = imp === "High" ? "Medium" : imp === "Medium" ? "Low" : "Low";
      const title = rec.problem || rec.recommendation_type || `Advisor recommendation #${i + 1}`;
      const resourceLabel = rec.resource || "";
      const severity = imp === "High" ? "High" : imp === "Medium" ? "Medium" : "Low";
      return {
        id: i,
        title,
        savings: savingsDisplay,
        effort,
        impact: imp,
        prompt: `Implement advisor recommendation: ${title}. Solution: ${rec.solution || ""}`,
        solution: rec.solution || "",
        category: cat,
        resource: resourceLabel,
        severity,
        impactCategory: rec.category || "",
      };
    });
  }, [advisorRecs, currency]);

  /* ── Optimization categories with real savings from Advisor ── */
  const optimizationCategories = useMemo(() => {
    const costRecs = advisorRecs.filter((r: any) => (r.category || "").toLowerCase() === "cost");
    const totalAdvisorSavings = costRecs
      .map((r: any) => Number(r.potentialSavings ?? 0))
      .reduce((s: number, v: number) => s + v, 0);

    const vmSavings = costRecs
      .filter((r: any) => (r.problem || "").toLowerCase().includes("vm") || (r.problem || "").toLowerCase().includes("virtual machine"))
      .map((r: any) => Number(r.potentialSavings ?? 0))
      .reduce((s: number, v: number) => s + v, 0);

    const storageSavings = costRecs
      .filter((r: any) => (r.problem || "").toLowerCase().includes("storage") || (r.problem || "").toLowerCase().includes("disk"))
      .map((r: any) => Number(r.potentialSavings ?? 0))
      .reduce((s: number, v: number) => s + v, 0);

    const dbSavings = costRecs
      .filter((r: any) => (r.problem || "").toLowerCase().includes("sql") || (r.problem || "").toLowerCase().includes("database"))
      .map((r: any) => Number(r.potentialSavings ?? 0))
      .reduce((s: number, v: number) => s + v, 0);

    const formatOrNa = (val: number) => val > 0 ? formatMonthly(val, currency) : "N/A";

    return [
      { title: "VM Rightsizing", description: "Optimize VM sizes based on usage", icon: <Server className="h-5 w-5 text-blue-600" />, iconBg: "bg-blue-100 dark:bg-blue-900/40", savings: formatOrNa(vmSavings), prompt: "I want to optimize my virtual machine sizes based on actual usage patterns. Please analyze CPU, memory, and disk usage across all VMs, identify over-provisioned resources, recommend appropriate VM sizes for right-sizing, and provide estimated cost savings." },
      { title: "Reserved Instances", description: "Save with reserved instances", icon: <Clock className="h-5 w-5 text-green-600" />, iconBg: "bg-green-100 dark:bg-green-900/40", savings: formatOrNa(0), prompt: "I want to optimize costs using Azure Reserved Instances. Please analyze my workload patterns, identify resources that would benefit from reserved instances, recommend the best reservation terms (1-year, 3-year), and calculate potential savings compared to pay-as-you-go pricing." },
      { title: "Storage Optimization", description: "Optimize storage tiers and cleanup", icon: <Database className="h-5 w-5 text-purple-600" />, iconBg: "bg-purple-100 dark:bg-purple-900/40", savings: formatOrNa(storageSavings), prompt: "I want to optimize my Azure storage costs. Please analyze storage usage across all storage accounts, identify opportunities for tier optimization (hot, cool, archive), find unused or stale data that can be deleted or archived, and provide recommendations for cost reduction." },
      { title: "Idle Resources", description: "Identify and remove idle resources", icon: <Zap className="h-5 w-5 text-amber-600" />, iconBg: "bg-amber-100 dark:bg-amber-900/40", savings: formatOrNa(0), prompt: "I want to identify and remove idle or unused Azure resources. Please analyze all resources for inactivity, identify orphaned resources (disks, NICs, IPs with no parent), find resources with zero usage over the past 30 days, and provide a cleanup plan with estimated cost savings." },
      { title: "Database Optimization", description: "Optimize database configurations", icon: <Layers className="h-5 w-5 text-cyan-600" />, iconBg: "bg-cyan-100 dark:bg-cyan-900/40", savings: formatOrNa(dbSavings), prompt: "I want to optimize my Azure database costs and performance. Please analyze database configurations, identify over-provisioned compute and storage, recommend appropriate service tiers and performance levels, and provide optimization recommendations for both SQL and NoSQL databases." },
      { title: "Spot Instances", description: "Use spot instances for workloads", icon: <Target className="h-5 w-5 text-indigo-600" />, iconBg: "bg-indigo-100 dark:bg-indigo-900/40", savings: formatOrNa(0), prompt: "I want to leverage Azure Spot Instances for cost savings. Identify workloads suitable for spot instances (batch processing, dev/test, fault-tolerant apps), recommend implementation strategies, and provide guidance on handling spot instance evictions and ensuring high availability." },
    ];
  }, [advisorRecs, currency]);

  /* ── Apply recommendation full flow ── */
  const handleApplyRec = useCallback(async (recId: number, prompt: string) => {
    setRecStates(prev => ({ ...prev, [recId]: "validating" }));
    try {
      setRecStates(prev => ({ ...prev, [recId]: "planning" }));
      const ctx = { costs, resources: resources?.length };
      const agentCfg = useSettingsStore.getState().agents.optimization;
      await apiService.analyzeWithAI(prompt, ctx as any, undefined, {
        azure_endpoint: agentCfg.azureEndpoint,
        azure_key: agentCfg.openaiApiKey,
        azure_deployment: agentCfg.model,
        azure_api_version: agentCfg.apiVersion,
      });
      setRecStates(prev => ({ ...prev, [recId]: "awaiting_approval" }));
      setShowApprovalDialog(recId);
    } catch {
      setRecStates(prev => ({ ...prev, [recId]: "failed" }));
      addNotification({ title: "Validation failed", message: "Could not validate this recommendation", status: "error", category: "tenant_sync" });
    }
  }, [costs, resources, addNotification]);

  const executeRecommendation = async (recId: number) => {
    const rec = recommendations.find(r => r.id === recId);
    setShowApprovalDialog(null);
    setRecStates(prev => ({ ...prev, [recId]: "executing" }));
    try {
      const agentCfg = useSettingsStore.getState().agents.optimization;
      await apiService.analyzeWithAI(`Execute: ${rec?.prompt || ""}`, { mode: "execute", recommendation_id: recId } as any, undefined, {
        azure_endpoint: agentCfg.azureEndpoint,
        azure_key: agentCfg.openaiApiKey,
        azure_deployment: agentCfg.model,
        azure_api_version: agentCfg.apiVersion,
      });
      setRecStates(prev => ({ ...prev, [recId]: "completed" }));
      addNotification({ title: "Recommendation applied", message: "Tenant state updated successfully", status: "success", category: "tenant_sync" });
      await resync();
    } catch {
      setRecStates(prev => ({ ...prev, [recId]: "failed" }));
      addNotification({ title: "Execution failed", message: "Could not apply this recommendation", status: "error", category: "tenant_sync" });
    }
  };

  const handleOptimizationSubmit = (value: string) => {
    const matchedLabel = quickActions.find(q => q.prompt === value)?.label
      || optimizationCategories.find(c => c.prompt === value)?.title
      || recommendations.find(r => r.prompt === value)?.title
      || "Custom Optimization";
    const runs = JSON.parse(localStorage.getItem("assessment_runs") || "[]");
    runs.push({ id: `run_${Date.now()}`, type: matchedLabel, timestamp: Date.now(), status: "completed" });
    localStorage.setItem("assessment_runs", JSON.stringify(runs));
  };

  const quickActions = [
    { label: "Find Cost Savings", prompt: "Analyze my Azure resources and identify potential cost optimization opportunities across compute, storage, and networking.", icon: <PiggyBank className="h-4 w-4 text-green-500" />, iconBg: "bg-green-50 dark:bg-green-900/30" },
    { label: "Rightsize VMs", prompt: "Identify virtual machines that can be rightsized based on actual usage patterns to reduce costs.", icon: <Server className="h-4 w-4 text-blue-500" />, iconBg: "bg-blue-50 dark:bg-blue-900/30" },
    { label: "Optimize Storage", prompt: "Find storage optimization opportunities including unused resources, tier optimization, and cleanup.", icon: <Database className="h-4 w-4 text-purple-500" />, iconBg: "bg-purple-50 dark:bg-purple-900/30" },
    { label: "Reserved Instances", prompt: "Analyze workload patterns and recommend reserved instance purchases for maximum cost savings.", icon: <Clock className="h-4 w-4 text-amber-500" />, iconBg: "bg-amber-50 dark:bg-amber-900/30" },
    { label: "Cleanup Resources", prompt: "Identify and remove unused or orphaned resources that are incurring costs without providing value.", icon: <Layers className="h-4 w-4 text-rose-500" />, iconBg: "bg-rose-50 dark:bg-rose-900/30" },
    { label: "Network Optimization", prompt: "Optimize network costs by analyzing traffic patterns and recommending cost-effective routing options.", icon: <Target className="h-4 w-4 text-cyan-500" />, iconBg: "bg-cyan-50 dark:bg-cyan-900/30" },
    { label: "Budget Analysis", prompt: "Analyze current spending against budget and provide forecasting for upcoming billing periods.", icon: <Wallet className="h-4 w-4 text-indigo-500" />, iconBg: "bg-indigo-50 dark:bg-indigo-900/30" },
  ];

  const placeholderVariants = [
    "Find underutilized Azure resources...",
    "Generate cost optimization recommendations...",
    "Analyze reserved instance opportunities...",
  ];

  /* ── Status badge helpers ── */
  const recStatusBadge = (state: string) => {
    switch (state) {
      case "validating": return { label: "Validating", className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" };
      case "planning": return { label: "Planning", className: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" };
      case "awaiting_approval": return { label: "Needs Approval", className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" };
      case "executing": return { label: "Executing", className: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400" };
      case "completed": return { label: "Applied", className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" };
      case "failed": return { label: "Failed", className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" };
      default: return { label: "Pending", className: "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400" };
    }
  };

  const activeRecs = recommendations;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />

      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator />

        <main className="p-4 lg:p-5">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Optimization Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Optimize Azure infrastructure costs and performance using Azure Cost Management &amp; Advisor.
                    <span className="ml-2 text-xs">Currency: {costs?.currency || "N/A"}{currency ? ` (${currencySymbol})` : ""}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="h-8 text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 hover:bg-azure-50 dark:hover:bg-azure-900/20">
                    <LayoutDashboardIcon className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant */}
            <AnimatedGradientChatInput
              title="Optimization Assist"
              icon={<TrendingDown className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              agentType="optimization"
              className="mb-6"
              value={chatInput}
              onValueChange={setChatInput}
              onSubmit={handleOptimizationSubmit}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Savings Summary */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                      Savings Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Potential Monthly Savings</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {potentialSavings.total > 0 ? formatMonthly(potentialSavings.total, currency) : "N/A"}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                          Based on {advisorCount} Advisor recommendation{advisorCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Current Month Spend</p>
                        <p className="text-2xl font-bold text-azure-600 dark:text-azure-400">
                          {formatMonthly(mtd, currency)}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                          Forecast: {formatCurrency(forecast, currency)}
                        </p>
                      </div>
                      <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Available Recommendations</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeRecs.length}</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                          {activeRecs.filter(r => r.category === "cost").length} cost-related
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Optimization Categories */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Optimization Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {optimizationCategories.map((category, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                          onClick={() => setChatInput(category.prompt)}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", category.iconBg)}>
                            {category.icon}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{category.title}</h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">{category.description}</p>
                          <div className={cn("flex items-center gap-1 font-medium text-sm", category.savings === "N/A" ? "text-gray-400 dark:text-slate-500" : "text-emerald-600 dark:text-emerald-400")}>
                            <TrendingDown className={cn("h-3.5 w-3.5", category.savings === "N/A" ? "text-gray-400 dark:text-slate-500" : "")} />
                            {category.savings}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Real Advisor Recommendations */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Advisor Recommendations
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {advisorCount > 0
                        ? `${advisorCount} recommendation${advisorCount !== 1 ? "s" : ""} from Azure Advisor`
                        : "Resync tenant data to fetch recommendations from Azure Advisor"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeRecs.length === 0 && (
                        <div className="text-center py-8 text-xs text-gray-400 dark:text-slate-500">
                          {advisorRecs.length === 0
                            ? "No recommendations available. Click Resync to refresh from Azure Advisor."
                            : "All recommendations have been processed."}
                        </div>
                      )}
                      {activeRecs.map((rec) => {
                        const state = recStates[rec.id] || "pending";
                        const badge = recStatusBadge(state);
                        return (
                          <motion.div
                            key={rec.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-4 p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                rec.category === "cost" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                                rec.category === "security" ? "bg-red-100 dark:bg-red-900/30" :
                                rec.category === "performance" ? "bg-blue-100 dark:bg-blue-900/30" :
                                rec.category === "highavailability" ? "bg-purple-100 dark:bg-purple-900/30" :
                                "bg-gray-100 dark:bg-slate-700"
                              )}>
                                {rec.category === "cost" ? <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> :
                                 rec.category === "security" ? <Shield className="h-5 w-5 text-red-600 dark:text-red-400" /> :
                                 rec.category === "performance" ? <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" /> :
                                 <HelpCircle className="h-5 w-5 text-gray-600 dark:text-slate-400" />}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{rec.title}</h4>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-slate-400 mb-1.5">
                                {rec.impactCategory && <span>{rec.impactCategory}</span>}
                                {rec.resource && <span className="truncate max-w-[200px]" title={rec.resource}>Resource: {rec.resource}</span>}
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{rec.savings}</span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-medium",
                                  rec.effort === "Low" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                                  rec.effort === "Medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                                  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                )}>
                                  {rec.effort} Effort
                                </span>
                                {rec.severity && (
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-medium",
                                    rec.severity === "High" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                                    rec.severity === "Medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                                    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                  )}>
                                    {rec.severity} Severity
                                  </span>
                                )}
                                {state !== "pending" && (
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badge.className)}>
                                    {badge.label}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (state === "completed" || state === "executing") return;
                                if (state === "awaiting_approval") { setShowApprovalDialog(rec.id); return; }
                                handleApplyRec(rec.id, rec.prompt);
                              }}
                              disabled={state === "executing" || state === "validating" || state === "planning"}
                              className={cn(
                                "h-8 flex-shrink-0 transition-all",
                                state === "completed" && "bg-emerald-500 hover:bg-emerald-600 text-white",
                                state === "failed" && "bg-red-500 hover:bg-red-500 text-white"
                              )}
                            >
                              {state === "validating" ? "Validating..." :
                               state === "planning" ? "Planning..." :
                               state === "awaiting_approval" ? "Approve" :
                               state === "executing" ? "Executing..." :
                               state === "completed" ? <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Applied</> :
                               state === "failed" ? "Retry" : "Apply"}
                            </Button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Savings Breakdown */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Savings Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {potentialSavings.total > 0 ? (
                      <div className="space-y-3">
                        {potentialSavings.breakdown.map((item) => (
                          <div key={item.label} className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-slate-400">{item.label}</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatMonthly(item.value, currency)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No savings data available. Resync your tenant to get cost recommendations from Azure Advisor.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Cost Trend */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Monthly Cost Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(costByService).length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-slate-400">MTD</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(mtd, currency)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-slate-400">Forecast</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(forecast, currency)}</span>
                        </div>
                        {budgetConfigured && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-slate-400">Budget</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(budgetAmount!, currency)}</span>
                          </div>
                        )}
                        <div className="pt-2">
                          <p className="text-[10px] font-medium text-gray-500 dark:text-slate-400 mb-2">Cost by Service</p>
                          <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={Object.entries(costByService).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + "..." : name, value }))} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} width={20} />
                              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, border: '1px solid #e5e7eb', padding: '4px 8px' }} />
                              <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={24}>
                                {Object.entries(costByService).sort(([, a], [, b]) => b - a).slice(0, 6).map((_, i) => (
                                  <Cell key={i} fill={["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"][i % 6]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No billing data available. Resync to fetch cost data from Azure Cost Management.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Budget Status */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Budget Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {budgetConfigured ? (
                      <div className="space-y-3">
                        <div className="text-center py-2">
                          <p className={cn(
                            "text-3xl font-bold",
                            budgetUsed > 85 ? "text-red-600 dark:text-red-400" : budgetUsed > 70 ? "text-amber-600 dark:text-amber-400" : "text-azure-600 dark:text-azure-400"
                          )}>{budgetUsed}%</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">of {formatCurrency(budgetAmount!, currency)} used</p>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-slate-400">Remaining</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(budgetRemaining, currency)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-slate-400">Forecast</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(forecast, currency)}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearBudget} className="w-full h-7 text-xs mt-2">
                          Clear Budget
                        </Button>
                      </div>
                    ) : showBudgetInput ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500 dark:text-slate-400 text-center">Enter your monthly budget</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{currencySymbol}</span>
                          <input
                            type="number"
                            value={budgetInputValue}
                            onChange={(e) => setBudgetInputValue(e.target.value)}
                            placeholder="5000"
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveBudget} className="h-7 text-xs flex-1">Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setShowBudgetInput(false)} className="h-7 text-xs">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertTriangle className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">No Budget Configured</p>
                        <Button variant="outline" size="sm" onClick={() => { setShowBudgetInput(true); setBudgetInputValue(""); }} className="h-7 text-xs">
                          Set Budget
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Advisor Summary */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Advisor Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {["High", "Medium", "Low"].map((imp) => {
                        const count = advisorRecs.filter((r: any) => (r.impact || "Low") === imp).length;
                        return (
                          <div key={imp} className="flex items-center justify-between">
                            <span className={cn(
                              "text-xs font-medium",
                              imp === "High" ? "text-red-600 dark:text-red-400" :
                              imp === "Medium" ? "text-amber-600 dark:text-amber-400" :
                              "text-blue-600 dark:text-blue-400"
                            )}>{imp} Impact</span>
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">{count}</span>
                          </div>
                        );
                      })}
                      {advisorRecs.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 text-center pt-2">No recommendations from Azure Advisor</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Approval Dialog */}
      <AnimatePresence>
        {showApprovalDialog != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowApprovalDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Apply Recommendation</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                This recommendation has been validated and a remediation plan is ready. Applying will execute the changes via Azure SDK and refresh the dashboard.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  This will make real changes to your Azure resources. Review the impact carefully.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => { setShowApprovalDialog(null); setRecStates(prev => ({ ...prev, [showApprovalDialog!]: "pending" })); }} className="flex-1 h-9 text-xs">
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Reject
                </Button>
                <Button size="sm" onClick={() => executeRecommendation(showApprovalDialog!)} className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Approve & Execute
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Shield(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}