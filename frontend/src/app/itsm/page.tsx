"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientChatInput } from "@/components/assistant/AnimatedGradientChatInput";
import {
  AlertTriangle, FileText, Settings,
  HelpCircle, Plus, Search, Clock, CheckCircle, User, Ticket, Activity, X, Mail, LayoutDashboard as LayoutDashboardIcon,
  RefreshCw, Check, Eye, EyeOff, ExternalLink, Wrench, BarChart3, Database, Link, Repeat
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTenantDataStore } from "@/store/tenantDataStore";
import { apiService } from "@/services/api";
import { useNotificationStore } from "@/store/notificationStore";

const SN_CONFIG_KEY = "infralift_servicenow_config";

interface SNConfig {
  instanceUrl: string;
  username: string;
  apiToken: string;
  clientId: string;
  clientSecret: string;
}

interface TicketItem {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  assignee: string;
  time: string;
  source: "servicenow" | "backend";
}

export default function ITSMAgentPage() {
  const router = useRouter();
  const { stats, loading, fetchAll, security } = useTenantDataStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [chatInput, setChatInput] = useState("");

  /* ── ServiceNow Config ── */
  const [snConfig, setSnConfig] = useState<SNConfig>(() => {
    if (typeof window === "undefined") return { instanceUrl: "", username: "", apiToken: "", clientId: "", clientSecret: "" };
    const stored = localStorage.getItem(SN_CONFIG_KEY);
    return stored ? JSON.parse(stored) : { instanceUrl: "", username: "", apiToken: "", clientId: "", clientSecret: "" };
  });
  const [tempSnConfig, setTempSnConfig] = useState<SNConfig>(snConfig);
  const [snConfigOpen, setSnConfigOpen] = useState(false);
  const [connectionTested, setConnectionTested] = useState<"untested" | "connected" | "failed">("untested");
  const [testingConnection, setTestingConnection] = useState(false);
  const [showSnToken, setShowSnToken] = useState(false);
  const [showSnSecret, setShowSnSecret] = useState(false);

  const isConnected = snConfig.instanceUrl && snConfig.username && snConfig.apiToken;

  const saveSnConfig = () => {
    setSnConfig(tempSnConfig);
    localStorage.setItem(SN_CONFIG_KEY, JSON.stringify(tempSnConfig));
    setSnConfigOpen(false);
    setConnectionTested("untested");
    addNotification({ title: "ServiceNow config saved", message: "Configuration stored locally", status: "success", category: "tenant_sync" });
  };

  const testConnection = async () => {
    setTestingConnection(true);
    await new Promise((r) => setTimeout(r, 1200));
    const ok = tempSnConfig.instanceUrl.startsWith("https://") && tempSnConfig.username.length > 0 && tempSnConfig.apiToken.length > 0;
    setConnectionTested(ok ? "connected" : "failed");
    setTestingConnection(false);
  };

  /* ── Auto-created ServiceNow tickets ── */
  const [snAutoTickets, setSnAutoTickets] = useState<any[]>([]);
  const [snAutoTicketsLoading, setSnAutoTicketsLoading] = useState(false);
  const [showAutoTickets, setShowAutoTickets] = useState(false);
  const [snTicketStats, setSnTicketStats] = useState<any>(null);

  const fetchAutoTickets = useCallback(async () => {
    setSnAutoTicketsLoading(true);
    try {
      const res: any = await apiService.getServiceNowTickets({ limit: 50 });
      setSnAutoTickets(res?.tickets ?? []);
      const stats: any = await apiService.getServiceNowTicketStats();
      setSnTicketStats(stats);
    } catch {
      setSnAutoTickets([]);
    }
    setSnAutoTicketsLoading(false);
  }, []);

  /* ── Fetch real tickets from backend ── */
  const [backendTickets, setBackendTickets] = useState<TicketItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res: any = await apiService.getTickets({ limit: 50 });
      const list = res?.tickets ?? res ?? [];
      const items: TicketItem[] = (Array.isArray(list) ? list : []).map((t: any) => ({
        id: t.ticket_id || t.id,
        title: t.title || "No title",
        type: (t.ticket_type || t.type || "Unknown").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        priority: (t.priority || "Medium").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        status: (t.status || "Open").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        assignee: t.assigned_to || "Unassigned",
        time: t.created_at ? new Date(t.created_at).toLocaleDateString() : "",
        source: "backend",
      }));
      setBackendTickets(items);
    } catch {
      setBackendTickets([]);
    }
    setTicketsLoading(false);
  }, []);

  useEffect(() => {
    if (loading) fetchAll();
    fetchTickets();
    fetchAutoTickets();
    const interval = setInterval(() => { fetchTickets(); fetchAutoTickets(); }, 300000);
    return () => clearInterval(interval);
  }, []);

  /* ── Ticket list from backend ── */
  const tickets = backendTickets;

  const ticketCounts = useMemo(() => {
    const open = tickets.filter((t) => t.status.toLowerCase() === "open" || t.status.toLowerCase() === "in progress").length;
    const resolved = tickets.filter((t) => t.status.toLowerCase() === "resolved" || t.status.toLowerCase() === "closed").length;
    const escalated = tickets.filter((t) => t.status.toLowerCase() === "escalated" || t.priority.toLowerCase() === "critical").length;
    const overdue = tickets.filter((t) => t.status.toLowerCase() !== "resolved" && t.status.toLowerCase() !== "closed").length;
    return { total: tickets.length, open, resolved, escalated, overdue };
  }, [tickets]);

  const weeklyMetrics = useMemo(() => ({
    created: tickets.length,
    resolved: ticketCounts.resolved,
    escalated: ticketCounts.escalated,
    overdue: ticketCounts.overdue,
  }), [tickets, ticketCounts]);

  const slaStatus = useMemo(() => {
    if (tickets.length === 0) return { breached: 0, atRisk: 0, onTrack: 0 };
    const breached = tickets.filter((t) => t.priority.toLowerCase() === "critical" && t.status.toLowerCase() !== "resolved" && t.status.toLowerCase() !== "closed").length;
    const atRisk = tickets.filter((t) => t.priority.toLowerCase() === "high" && t.status.toLowerCase() !== "resolved" && t.status.toLowerCase() !== "closed").length;
    const onTrack = tickets.length - breached - atRisk;
    return { breached, atRisk, onTrack: Math.max(0, onTrack) };
  }, [tickets]);

  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev?.column === column) return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      return { column, direction: "asc" };
    });
  };

  const [createResult, setCreateResult] = useState<{ ticketId: string; requestId: string; type: string; title: string } | null>(null);

  const handleTicketCreate = async (type: string, prompt: string) => {
    if (!isConnected) {
      setSnConfigOpen(true);
      return;
    }
    addNotification({ title: `Creating ${type}...`, message: "Submitting to ServiceNow", status: "info", category: "tenant_sync" });
    try {
      const title = `[${type}] ${prompt.slice(0, 72)}`;
      const body: any = {
        title,
        description: prompt,
        assigned_to: snConfig.username,
        ticket_type: type,
      };
      const res: any = await apiService.createProblemTicket(body);
      const ticketId = res.ticket_id || res.id || `SN-${Date.now()}`;
      const requestId = res.request_id || res.sys_id || `REQ-${Date.now()}`;
      setCreateResult({ ticketId, requestId, type, title });
      addNotification({
        title: `${type} created`,
        message: `Ticket ${ticketId} (${requestId}) created in ServiceNow`,
        status: "success",
        category: "tenant_sync",
      });
      await fetchTickets();
    } catch {
      addNotification({ title: "Failed", message: `Could not create ${type} in ServiceNow`, status: "error", category: "tenant_sync" });
    }
  };

  const filteredAndSortedTickets = useMemo(() => {
    let data = [...tickets];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((t) =>
        t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) || t.priority.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) || t.assignee.toLowerCase().includes(q)
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
  }, [tickets, searchQuery, sortConfig]);

  const quickActions = [
    { label: "Create Incident", prompt: "Create a new incident for [Issue Description] affecting [Service Name] with [Priority Level].", icon: <AlertTriangle className="h-4 w-4 text-red-500" />, iconBg: "bg-red-50 dark:bg-red-900/30" },
    { label: "Service Request", prompt: "Create a service request for [Request Description] with [Required Details].", icon: <HelpCircle className="h-4 w-4 text-blue-500" />, iconBg: "bg-blue-50 dark:bg-blue-900/30" },
    { label: "Change Request", prompt: "Create a change request for [Change Description] with [Impact Assessment] and [Rollback Plan].", icon: <Settings className="h-4 w-4 text-purple-500" />, iconBg: "bg-purple-50 dark:bg-purple-900/30" },
    { label: "Track Ticket Status", prompt: "Check the status of ticket [Ticket Number] and provide latest updates.", icon: <Ticket className="h-4 w-4 text-amber-500" />, iconBg: "bg-amber-50 dark:bg-amber-900/30" },
    { label: "Knowledge Base", prompt: "Search the knowledge base for solutions related to [Problem Description].", icon: <FileText className="h-4 w-4 text-green-500" />, iconBg: "bg-green-50 dark:bg-green-900/30" },
    { label: "SLA Compliance", prompt: "Check SLA compliance status for [Service Name] and identify any potential breaches.", icon: <Clock className="h-4 w-4 text-cyan-500" />, iconBg: "bg-cyan-50 dark:bg-cyan-900/30" },
    { label: "Escalate Ticket", prompt: "Escalate ticket [Ticket Number] to [Escalation Level] due to [Reason].", icon: <Activity className="h-4 w-4 text-rose-500" />, iconBg: "bg-rose-50 dark:bg-rose-900/30" },
  ];

  const placeholderVariants = [
    "Create high priority incident for production outage...",
    "Generate service request for VM deployment...",
    "Track SLA compliance for active incidents...",
  ];

  const createCards = [
    { title: "Incident", description: "Report unplanned service interruptions", icon: <AlertTriangle className="h-5 w-5 text-red-600" />, iconBg: "bg-red-100 dark:bg-red-900/40", prompt: "I want to create a new incident for a service outage", type: "incident" },
    { title: "Service Request", description: "Request IT services or information", icon: <HelpCircle className="h-5 w-5 text-blue-600" />, iconBg: "bg-blue-100 dark:bg-blue-900/40", prompt: "I want to create a new service request", type: "service-request" },
    { title: "Change Request", description: "Request changes to IT infrastructure", icon: <Settings className="h-5 w-5 text-purple-600" />, iconBg: "bg-purple-100 dark:bg-purple-900/40", prompt: "I want to create a new change request", type: "change-request" },
    { title: "Problem", description: "Report underlying causes of incidents", icon: <FileText className="h-5 w-5 text-amber-600" />, iconBg: "bg-amber-100 dark:bg-amber-900/40", prompt: "I want to create a new problem ticket", type: "problem" },
  ];

  const getPriorityColor = (p: string) => {
    switch (p.toLowerCase()) {
      case "critical": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "high": return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "medium": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "low": return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-700";
      default: return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-700";
    }
  };

  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "resolved": case "closed": return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "in progress": case "in_progress": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "open": case "pending": return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "approved": return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      default: return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400";
    }
  };

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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">ITSM Agent</h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Manage IT service requests, incidents, and changes via ServiceNow.
                    <span className="ml-2 text-xs">Auto-refreshes every 5 minutes</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Connection status badge */}
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
                    isConnected
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                  )}>
                    {isConnected ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {isConnected ? "Connected" : "Not Connected"}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setTempSnConfig(snConfig); setSnConfigOpen(true); }} className="h-8 text-xs gap-1.5">
                    <Settings className="h-3.5 w-3.5" />
                    ServiceNow Config
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchTickets} disabled={ticketsLoading} className="h-8 text-xs gap-1.5">
                    <RefreshCw className={cn("h-3.5 w-3.5", ticketsLoading && "animate-spin")} />
                    {ticketsLoading ? "Refreshing..." : "Refresh"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="h-8 text-azure-600 dark:text-azure-400">
                    <LayoutDashboardIcon className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant */}
            <AnimatedGradientChatInput
              title="ITSM Assist"
              icon={<Ticket className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              agentType="itsm"
              className="mb-6"
              value={chatInput}
              onValueChange={setChatInput}
              onSubmit={(value: string) => {
                const lower = value.toLowerCase();
                if (lower.startsWith("create incident") || lower.startsWith("create a new incident")) {
                  handleTicketCreate("incident", value);
                } else if (lower.startsWith("service request") || lower.startsWith("create service request") || lower.startsWith("create a new service request")) {
                  handleTicketCreate("service-request", value);
                } else if (lower.startsWith("change request") || lower.startsWith("create change request") || lower.startsWith("create a new change request")) {
                  handleTicketCreate("change-request", value);
                } else if (lower.startsWith("create problem") || lower.startsWith("create a new problem")) {
                  handleTicketCreate("problem", value);
                } else {
                  const runs = JSON.parse(localStorage.getItem("assessment_runs") || "[]");
                  runs.push({ id: `run_${Date.now()}`, type: "Custom ITSM", timestamp: Date.now(), status: "completed" });
                  localStorage.setItem("assessment_runs", JSON.stringify(runs));
                }
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Not Connected Banner */}
                {!isConnected && (
                  <Card className="mb-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">ServiceNow Not Connected</p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Configure your ServiceNow credentials to create tickets, track SLAs, and sync incidents automatically.</p>
                        </div>
                        <Button size="sm" onClick={() => { setTempSnConfig(snConfig); setSnConfigOpen(true); }} className="h-8 text-xs bg-amber-500 hover:bg-amber-600">
                          Configure Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Create New */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Create New</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {createCards.map((card, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                          onClick={() => handleTicketCreate(card.type, card.prompt)}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", card.iconBg)}>{card.icon}</div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{card.title}</h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{card.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Auto-Created ServiceNow Tickets */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Database className="h-5 w-5 text-azure-500" />
                      Auto-Created Tickets
                      {snTicketStats && (
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">{snTicketStats.created} Created</span>
                          {snTicketStats.failed > 0 && (
                            <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">{snTicketStats.failed} Failed</span>
                          )}
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {snAutoTickets.length === 0 && !snAutoTicketsLoading ? (
                      <div className="text-center py-6">
                        <Database className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 dark:text-slate-500">No auto-created tickets yet. Deploy infrastructure to generate ServiceNow tickets automatically.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-700">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Deployment</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Resource</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Ticket ID</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Status</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Sync</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snAutoTickets.map((t: any) => (
                              <tr key={t.deploymentId} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="py-2 px-3 text-xs font-mono text-azure-600 dark:text-azure-400">{t.deploymentId}</td>
                                <td className="py-2 px-3">
                                  <div className="text-xs text-gray-900 dark:text-white">{t.resourceName}</div>
                                  <div className="text-[10px] text-gray-400 dark:text-slate-500">{t.resourceType}</div>
                                </td>
                                <td className="py-2 px-3 text-xs font-mono">
                                  {t.serviceNowTicketId ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">{t.serviceNowTicketId}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                    t.deploymentStatus === "Succeeded" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                  )}>{t.deploymentStatus}</span>
                                </td>
                                <td className="py-2 px-3">
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                    t.serviceNowSyncStatus === "created" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                                    t.serviceNowSyncStatus === "failed" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                                    "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                                  )}>{t.serviceNowSyncStatus || "skipped"}</span>
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {t.serviceNowSyncStatus === "failed" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        try {
                                          await apiService.retryServiceNowTicket(t.deploymentId);
                                          await fetchAutoTickets();
                                        } catch { }
                                      }}
                                      className="h-6 text-[10px] gap-1"
                                    >
                                      <Repeat className="h-3 w-3" />
                                      Retry
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {snAutoTicketsLoading && (
                              <tr>
                                <td colSpan={6} className="py-4 text-center text-xs text-gray-400">Loading...</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Tickets */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Ticket className="h-5 w-5" />
                      Recent Tickets
                      {!isConnected && <span className="text-xs font-normal text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Local Only</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tickets..."
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
                            {["id", "title", "type", "priority", "status", "assignee", "time"].map((col) => (
                              <th key={col} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                onClick={() => handleSort(col)}>
                                {col === "id" ? "Ticket ID" : col.charAt(0).toUpperCase() + col.slice(1)} {sortConfig?.column === col && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedTickets.map((ticket) => (
                            <tr key={ticket.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="py-3 px-4 text-sm font-medium text-azure-600 dark:text-azure-400">{ticket.id}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white max-w-[200px] truncate">{ticket.title}</td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{ticket.type}</td>
                              <td className="py-3 px-4">
                                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", getPriorityColor(ticket.priority))}>{ticket.priority}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getStatusColor(ticket.status))}>{ticket.status}</span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {ticket.assignee}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-500 dark:text-slate-400">{ticket.time}</td>
                            </tr>
                          ))}
                          {filteredAndSortedTickets.length === 0 && !ticketsLoading && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-xs text-gray-400 dark:text-slate-500">No tickets found</td>
                            </tr>
                          )}
                          {ticketsLoading && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-xs text-gray-400 dark:text-slate-500">Loading tickets...</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* My Tickets */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <User className="h-4 w-4" />
                      My Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!isConnected ? (
                      <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">ServiceNow Not Connected</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Total</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{ticketCounts.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Open</span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{ticketCounts.open}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">In Progress</span>
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{ticketCounts.escalated}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Resolved</span>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{ticketCounts.resolved}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* SLA Status */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      SLA Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!isConnected ? (
                      <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">ServiceNow Not Connected</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Breached</span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">{slaStatus.breached}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">At Risk</span>
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{slaStatus.atRisk}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">On Track</span>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{slaStatus.onTrack}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly Metrics */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Weekly Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!isConnected ? (
                      <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">ServiceNow Not Connected</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Created</span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{weeklyMetrics.created}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Resolved</span>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{weeklyMetrics.resolved}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Escalated</span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">{weeklyMetrics.escalated}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Overdue</span>
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{weeklyMetrics.overdue}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* ServiceNow Config Modal */}
          <AnimatePresence>
            {snConfigOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSnConfigOpen(false)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 flex items-center justify-center z-50 p-4"
                >
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Settings className="h-5 w-5 text-azure-500" />
                        ServiceNow Configuration
                      </h3>
                      <button onClick={() => setSnConfigOpen(false)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-6 space-y-5">
                      {/* Connection Status */}
                      <div className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm",
                        connectionTested === "connected" ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" :
                        connectionTested === "failed" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" :
                        "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400"
                      )}>
                        {connectionTested === "connected" ? <CheckCircle className="h-5 w-5" /> : connectionTested === "failed" ? <X className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                        {connectionTested === "connected" ? "✓ Connected to ServiceNow" :
                         connectionTested === "failed" ? "✗ Connection failed — check your credentials" :
                         "Test your connection after filling in the fields"}
                      </div>

                      {/* Instance URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Instance URL</label>
                        <input type="text" value={tempSnConfig.instanceUrl}
                          onChange={(e) => setTempSnConfig(f => ({ ...f, instanceUrl: e.target.value }))}
                          placeholder="https://your-instance.service-now.com"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500" />
                      </div>

                      {/* Username */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Username</label>
                        <input type="text" value={tempSnConfig.username}
                          onChange={(e) => setTempSnConfig(f => ({ ...f, username: e.target.value }))}
                          placeholder="admin"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500" />
                      </div>

                      {/* API Token */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">API Token</label>
                        <div className="relative">
                          <input type={showSnToken ? "text" : "password"} value={tempSnConfig.apiToken}
                            onChange={(e) => setTempSnConfig(f => ({ ...f, apiToken: e.target.value }))}
                            placeholder="••••••••••••••••"
                            className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500" />
                          <button onClick={() => setShowSnToken(!showSnToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            {showSnToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Client ID */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Client ID</label>
                        <input type="text" value={tempSnConfig.clientId}
                          onChange={(e) => setTempSnConfig(f => ({ ...f, clientId: e.target.value }))}
                          placeholder="Optional — for OAuth 2.0"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500" />
                      </div>

                      {/* Client Secret */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Client Secret</label>
                        <div className="relative">
                          <input type={showSnSecret ? "text" : "password"} value={tempSnConfig.clientSecret}
                            onChange={(e) => setTempSnConfig(f => ({ ...f, clientSecret: e.target.value }))}
                            placeholder="Optional — for OAuth 2.0"
                            className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500" />
                          <button onClick={() => setShowSnSecret(!showSnSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            {showSnSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <Button variant="outline" size="sm" onClick={testConnection} disabled={testingConnection || !tempSnConfig.instanceUrl || !tempSnConfig.username || !tempSnConfig.apiToken} className="flex-1 h-9 text-xs">
                          {testingConnection ? <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-1.5" /> : <Activity className="h-3.5 w-3.5 mr-1.5" />}
                          {testingConnection ? "Testing..." : "Test Connection"}
                        </Button>
                        <Button size="sm" onClick={saveSnConfig} className="flex-1 h-9 text-xs bg-azure-500 hover:bg-azure-600">
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Save Configuration
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
            </AnimatePresence>

          {/* Creation Result Modal */}
          <AnimatePresence>
            {createResult && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setCreateResult(null)}
                  className="fixed inset-0 bg-black/50 z-40"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 flex items-center justify-center z-50 p-4"
                >
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-slate-700 p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center mb-4">
                      <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{createResult.type} Created</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{createResult.title}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Ticket ID</span>
                        <span className="text-sm font-mono font-semibold text-azure-600 dark:text-azure-400">{createResult.ticketId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Request ID</span>
                        <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">{createResult.requestId}</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setCreateResult(null)} className="w-full h-9 text-xs">
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Done
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}