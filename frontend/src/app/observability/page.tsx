"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Cpu, HardDrive, Globe, Database, AlertTriangle,
  Download, Maximize2, Minimize2, Search, ChevronDown,
  ArrowUp, ArrowDown, ArrowUpDown, Activity, Server, Wifi,
  GripHorizontal, BarChart3, LayoutDashboard, Clock,
  TrendingUp, CheckCircle, X, Shield, RefreshCw,
  Users, Layers, Container
} from "lucide-react";
import { useTenantDataStore } from "@/store/tenantDataStore";
import { useNotificationStore } from "@/store/notificationStore";
import html2canvas from "html2canvas";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from "recharts";

/* ─────────────────────── Types ─────────────────────── */

interface TableRow {
  name: string; type: string; cpu: number; memory: number;
  status: "healthy" | "warning" | "critical"; region: string;
}

interface DragState {
  chartId: string | null;
  startX: number; startY: number;
  origX: number; origY: number;
}

interface ResizeState {
  chartId: string | null;
  startX: number; startY: number;
  origW: number; origH: number;
}

interface OverviewKpi {
  label: string; value: string; icon: React.ReactNode;
  color: string; subtitle: string;
}

/* ─────────────────────── Helpers ─────────────────────── */

function extractFromByType(stats: any, suffix: string): number {
  if (!stats?.by_type) return 0;
  const key = Object.keys(stats.by_type).find((k) => k.endsWith(suffix));
  return key ? (stats.by_type[key] as number) : 0;
}

function getVmName(resourceId: string): string {
  const parts = resourceId.split("/");
  return parts[parts.length - 1] || resourceId;
}

function computeAvgFromTimeseries(timeseries: any[] | undefined, field = "average"): number | null {
  if (!timeseries || timeseries.length === 0) return null;
  const vals = timeseries.map((t) => t[field]).filter((v) => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function computeResourceDist(stats: any): { label: string; value: number; color: string }[] {
  if (!stats?.by_type) return [];
  const byType = stats.by_type as Record<string, number>;
  const map: Record<string, { value: number; color: string }> = {};

  Object.entries(byType).forEach(([key, val]) => {
    const v = val as number;
    if (key.includes("virtualMachines") || key.includes("VirtualMachines")) {
      map["VMs"] = { value: (map["VMs"]?.value ?? 0) + v, color: "#3b82f6" };
    } else if (key.includes("storageAccounts") || key.includes("StorageAccounts")) {
      map["Storage"] = { value: (map["Storage"]?.value ?? 0) + v, color: "#22c55e" };
    } else if (key.includes("databases") || key.includes("Databases") || key.includes("servers")) {
      map["Databases"] = { value: (map["Databases"]?.value ?? 0) + v, color: "#f59e0b" };
    } else if (key.includes("Network") || key.includes("network") || key.includes("publicIP") || key.includes("virtualNetworks") || key.includes("networkInterfaces") || key.includes("loadBalancers") || key.includes("networkSecurityGroups")) {
      map["Networking"] = { value: (map["Networking"]?.value ?? 0) + v, color: "#a855f7" };
    } else if (key.includes("managedClusters") || key.includes("ManagedClusters") || key.includes("ContainerService")) {
      map["AKS"] = { value: (map["AKS"]?.value ?? 0) + v, color: "#06b6d4" };
    } else if (!key.includes("resourceGroups") && !key.includes("ResourceGroups")) {
      map["Other"] = { value: (map["Other"]?.value ?? 0) + v, color: "#6b7280" };
    }
  });

  return Object.entries(map).map(([label, data]) => ({ label, ...data }));
}

function computeAlertSeverity(security: any): { label: string; value: number; color: string }[] {
  if (!security?.alerts || !Array.isArray(security.alerts)) return [];
  const counts: Record<string, number> = {};
  security.alerts.forEach((a: any) => {
    const sev = a.severity?.toLowerCase() || "low";
    if (sev === "high") counts["Critical"] = (counts["Critical"] ?? 0) + 1;
    else if (sev === "medium") counts["Warning"] = (counts["Warning"] ?? 0) + 1;
    else counts["Informational"] = (counts["Informational"] ?? 0) + 1;
  });
  const colorMap: Record<string, string> = {
    Critical: "#ef4444", Warning: "#f59e0b", Informational: "#3b82f6",
  };
  return Object.entries(counts).map(([label, value]) => ({ label, value, color: colorMap[label] ?? "#6b7280" }));
}

function computeStorageTier(resources: any[]): { label: string; used: number; total: number; color: string }[] {
  const storageAccts = resources.filter((r) => {
    const t = (r.type || "").toLowerCase();
    return t.includes("storageaccounts") || t.includes("storage_accounts");
  });
  const tiers: Record<string, { used: number; total: number }> = {
    Hot: { used: 0, total: 0 },
    Cool: { used: 0, total: 0 },
    Archive: { used: 0, total: 0 },
  };
  storageAccts.forEach((sa) => {
    const tier = (sa.properties?.accessTier || sa.sku?.tier || "Hot") as string;
    const cap = sa.properties?.primaryEndpoints?.blob ? 1024 : 100;
    if (tiers[tier]) tiers[tier].total += cap;
    else tiers["Hot"].total += cap;
  });
  const total = Object.values(tiers).reduce((s, t) => s + t.total, 0);
  if (total === 0) return [];
  const colorMap: Record<string, string> = { Hot: "#3b82f6", Cool: "#22c55e", Archive: "#f59e0b" };
  return Object.entries(tiers)
    .filter(([_, v]) => v.total > 0)
    .map(([label, v]) => ({ label: `${label} Tier`, used: v.used, total: v.total, color: colorMap[label] }));
}

function computeCpuTrend(metrics: any): { name: string; value: number }[] {
  const vms = metrics?.virtual_machines ?? [];
  if (vms.length === 0) return [];
  const points: Record<number, number[]> = {};
  vms.forEach((vm: any) => {
    const ts = vm.metrics?.["Percentage CPU"]?.timeseries ?? [];
    ts.forEach((t: any) => {
      const time = new Date(t.timestamp).getTime();
      if (!points[time]) points[time] = [];
      if (t.average != null) points[time].push(t.average);
    });
  });
  const sorted = Object.entries(points).sort(([a], [b]) => Number(a) - Number(b));
  return sorted.map(([ts, vals]) => ({
    name: new Date(Number(ts)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
  }));
}

function computeMemByVm(metrics: any): { label: string; value: number; color: string }[] {
  const vms = metrics?.virtual_machines ?? [];
  if (vms.length === 0) return [];
  return vms.slice(0, 10).map((vm: any, i: number) => {
    const timeseries = vm.metrics?.["Available Memory"]?.timeseries ?? [];
    const avgMem = computeAvgFromTimeseries(timeseries, "average");
    const memBytes = avgMem ?? 0;
    const totalMem = 8 * 1024 * 1024 * 1024;
    const pct = totalMem > 0 ? Math.round((1 - memBytes / totalMem) * 100) : 0;
    const name = getVmName(vm.resource_id);
    const colors = ["#8b5cf6", "#7c3aed", "#6d28d9", "#a78bfa", "#c4b5fd", "#ddd6fe", "#8b5cf6", "#7c3aed", "#6d28d9", "#a78bfa"];
    return { label: name, value: Math.min(100, Math.max(0, pct)), color: colors[i % colors.length] };
  });
}

function computeNetworkThroughput(metrics: any): { name: string; In: number; Out: number }[] {
  const vms = metrics?.virtual_machines ?? [];
  if (vms.length === 0) return [];
  const points: Record<number, { in: number[]; out: number[] }> = {};
  vms.forEach((vm: any) => {
    const inTs = vm.metrics?.["Network In"]?.timeseries ?? [];
    const outTs = vm.metrics?.["Network Out"]?.timeseries ?? [];
    inTs.forEach((t: any) => {
      if (t.average == null) return;
      const time = new Date(t.timestamp).getTime();
      if (!points[time]) points[time] = { in: [], out: [] };
      points[time].in.push(t.average);
    });
    outTs.forEach((t: any) => {
      if (t.average == null) return;
      const time = new Date(t.timestamp).getTime();
      if (!points[time]) points[time] = { in: [], out: [] };
      points[time].out.push(t.average);
    });
  });
  const sorted = Object.entries(points).sort(([a], [b]) => Number(a) - Number(b));
  return sorted.map(([ts, d]) => ({
    name: new Date(Number(ts)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    In: d.in.length > 0 ? Math.round(d.in.reduce((s, v) => s + v, 0) / d.in.length) : 0,
    Out: d.out.length > 0 ? Math.round(d.out.reduce((s, v) => s + v, 0) / d.out.length) : 0,
  }));
}

function computeTableRows(resources: any[], metrics: any): TableRow[] {
  const vmMetrics = metrics?.virtual_machines ?? [];
  const metricMap: Record<string, { cpu: number; mem: number }> = {};
  vmMetrics.forEach((vm: any) => {
    const name = getVmName(vm.resource_id);
    const cpuTimeseries = vm.metrics?.["Percentage CPU"]?.timeseries ?? [];
    const memTimeseries = vm.metrics?.["Available Memory"]?.timeseries ?? [];
    const avgCpu = computeAvgFromTimeseries(cpuTimeseries, "average");
    const avgMemBytes = computeAvgFromTimeseries(memTimeseries, "average");
    const totalMem = 8 * 1024 * 1024 * 1024;
    const memPct = avgMemBytes != null && totalMem > 0 ? Math.round((1 - avgMemBytes / totalMem) * 100) : 0;
    metricMap[name] = { cpu: avgCpu ?? 0, mem: memPct };
  });

  return resources.slice(0, 50).map((r: any) => {
    const name = r.name || "unknown";
    const m = metricMap[name];
    const statusRaw = (r.properties?.provisioningState || r.properties?.powerState || r.status || "Succeeded") as string;
    let status: TableRow["status"] = "healthy";
    if (["Failed", "Degraded", "Error", "Stopped", "Deallocated"].includes(statusRaw)) status = "critical";
    else if (["Updating", "Moving", "Warning"].includes(statusRaw)) status = "warning";
    return {
      name,
      type: (r.type || "Resource").split("/").pop() || "Resource",
      cpu: m ? Math.round(m.cpu) : 0,
      memory: m ? Math.round(m.mem) : 0,
      status,
      region: r.location || "Global",
    };
  });
}

/* ─────────────────────── Chart Components ─────────────────────── */

function CpuTrendChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[150px] text-xs text-gray-400 dark:text-slate-500">No CPU Metrics Available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} width={22} unit="%" />
        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, border: '1px solid #e5e7eb', padding: '4px 8px' }} />
        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: "#3b82f6" }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[150px] text-xs text-gray-400 dark:text-slate-500">No data</div>;
  }
  return (
    <div className="flex items-center gap-4 h-full">
      <div className="w-28 h-28 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={2} dataKey="value">
              {data.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 flex-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[11px] text-gray-600 dark:text-slate-400">{d.label}</span>
            <span className="text-[11px] font-medium text-gray-900 dark:text-white ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemByVmChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[150px] text-xs text-gray-400 dark:text-slate-500">No Memory Metrics Available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 2, right: 2, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={36} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} width={22} />
        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, border: '1px solid #e5e7eb', padding: '4px 8px' }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function NetworkChart({ data }: { data: { name: string; In: number; Out: number }[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[150px] text-xs text-gray-400 dark:text-slate-500">No Network Metrics Available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} width={22} />
        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, border: '1px solid #e5e7eb', padding: '4px 8px' }} />
        <Line type="monotone" dataKey="In" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} name="In" />
        <Line type="monotone" dataKey="Out" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Out" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function StorageTierChart({ data }: { data: { label: string; used: number; total: number; color: string }[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[150px] text-xs text-gray-400 dark:text-slate-500">No Storage Tier Data</div>;
  }
  const chartData = data.map(d => ({
    name: d.label,
    Used: d.total > 0 ? Math.round((d.used / d.total) * 100) : 0,
    Remaining: d.total > 0 ? 100 - Math.round((d.used / d.total) * 100) : 100,
    fill: d.color,
  }));
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={chartData} margin={{ top: 2, right: 2, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} width={22} unit="%" />
        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, border: '1px solid #e5e7eb', padding: '4px 8px' }} />
        <Bar dataKey="Used" stackId="a" radius={[2, 2, 0, 0]} maxBarSize={32}>
          {data.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
        </Bar>
        <Bar dataKey="Remaining" stackId="a" fill="#e5e7eb" radius={[2, 2, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AlertSeverityChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[150px] text-xs text-gray-400 dark:text-slate-500">No Alerts</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 2, right: 2, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} width={22} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, border: '1px solid #e5e7eb', padding: '4px 8px' }} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={28}>
          {data.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────── Chart Configs ─────────────────────── */

interface ChartContext {
  cpuTrend: { name: string; value: number }[];
  resourceDist: { label: string; value: number; color: string }[];
  memByVm: { label: string; value: number; color: string }[];
  networkData: { name: string; In: number; Out: number }[];
  storageTier: { label: string; used: number; total: number; color: string }[];
  alertData: { label: string; value: number; color: string }[];
}

const chartConfigs: { id: string; title: string; icon: React.ReactNode; render: (ctx: ChartContext) => React.ReactNode }[] = [
  { id: "cpu-trend", title: "CPU Usage Trend", icon: <Cpu className="h-3.5 w-3.5" />, render: (ctx) => <CpuTrendChart data={ctx.cpuTrend} /> },
  { id: "resource-dist", title: "Resource Distribution", icon: <Activity className="h-3.5 w-3.5" />, render: (ctx) => <DonutChart data={ctx.resourceDist} /> },
  { id: "mem-by-vm", title: "Memory Usage by VM", icon: <Server className="h-3.5 w-3.5" />, render: (ctx) => <MemByVmChart data={ctx.memByVm} /> },
  { id: "network-throughput", title: "Network Throughput", icon: <Wifi className="h-3.5 w-3.5" />, render: (ctx) => <NetworkChart data={ctx.networkData} /> },
  { id: "storage-by-tier", title: "Storage by Tier", icon: <HardDrive className="h-3.5 w-3.5" />, render: (ctx) => <StorageTierChart data={ctx.storageTier} /> },
  { id: "alert-severity", title: "Alert Severity", icon: <AlertTriangle className="h-3.5 w-3.5" />, render: (ctx) => <AlertSeverityChart data={ctx.alertData} /> },
];

/* ─────────────────────── Chart Card ─────────────────────── */

function ChartCard({
  id, title, icon, chartContext, minimized, onToggleMinimize,
  position, onDragStart, size, onResizeStart,
}: {
  id: string; title: string; icon: React.ReactNode;
  chartContext: ChartContext;
  minimized: boolean; onToggleMinimize: () => void;
  position: { x: number; y: number };
  onDragStart: (e: React.MouseEvent, chartId: string) => void;
  size: { w: number; h: number };
  onResizeStart: (e: React.MouseEvent, chartId: string) => void;
}) {
  const cfg = chartConfigs.find((c) => c.id === id)!;

  return (
    <motion.div
      layout
      className="absolute border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden group"
      style={{ left: position.x, top: position.y, width: size.w, height: size.h, zIndex: 10 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => onDragStart(e, id)}
      >
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
          <GripHorizontal className="h-3 w-3 opacity-40" />
          {icon}
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-200">{title}</span>
        </div>
        <button
          onClick={onToggleMinimize}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500"
        >
          {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
        </button>
      </div>
      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3">{cfg.render(chartContext)}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, id); }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-400 dark:text-slate-500">
          <line x1="8" y1="12" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="12" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="12" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  );
}

/* ─────────────────────── Overview KPI Card ─────────────────────── */

function OverviewKpiCard({ data, index }: { data: OverviewKpi; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className={cn(
        "p-4 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800",
        "hover:shadow-md hover:border-azure-200 dark:hover:border-azure-800 transition-all"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "p-1.5 rounded-md",
          data.color === "blue" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
          data.color === "purple" && "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
          data.color === "green" && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
          data.color === "amber" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
          data.color === "red" && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
          data.color === "cyan" && "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
          data.color === "gray" && "bg-gray-100 dark:bg-slate-700/50 text-gray-600 dark:text-slate-400",
        )}>
          {data.icon}
        </div>
        <span className="text-xs text-gray-500 dark:text-slate-400">{data.label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.value}</p>
      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{data.subtitle}</p>
    </motion.div>
  );
}

/* ─────────────────────── Data Table ─────────────────────── */

type SortField = "name" | "type" | "cpu" | "memory" | "status" | "region";
type SortDir = "asc" | "desc";

const statusColor: Record<string, string> = {
  healthy: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
};

const EXPORT_CSV_COLUMNS = ["Resource Name", "Type", "CPU %", "Memory %", "Status", "Region"];

function DataTable({ rows }: { rows: TableRow[] }) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let data = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.region.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const aVal = a[sortField] as any;
      const bVal = b[sortField] as any;
      if (typeof aVal === "string" && typeof bVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return data;
  }, [rows, sortField, sortDir, search]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const Th = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th
      className={cn("px-3 py-2.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-slate-200 select-none", className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">{label}<SortIcon field={field} /></div>
    </th>
  );

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-azure-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Resource Summary</span>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-azure-500 w-52"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
              <Th field="name" label="Resource Name" />
              <Th field="type" label="Type" />
              <Th field="cpu" label="CPU %" />
              <Th field="memory" label="Memory %" />
              <Th field="status" label="Status" />
              <Th field="region" label="Region" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {filtered.map((row) => (
              <motion.tr
                key={row.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <td className="px-3 py-2.5 text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{row.name}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-slate-400 whitespace-nowrap">{row.type}</td>
                <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-slate-300 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div className="h-full rounded-full" style={{ width: `${row.cpu}%`, backgroundColor: row.cpu > 80 ? "#ef4444" : row.cpu > 50 ? "#f59e0b" : "#22c55e" }} />
                    </div>
                    {row.cpu}%
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-slate-300 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div className="h-full rounded-full" style={{ width: `${row.memory}%`, backgroundColor: row.memory > 80 ? "#ef4444" : row.memory > 50 ? "#f59e0b" : "#22c55e" }} />
                    </div>
                    {row.memory}%
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", statusColor[row.status])}>{row.status}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-slate-400 whitespace-nowrap">{row.region}</td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-gray-400 dark:text-slate-500">No resources match your filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────── Main Page ─────────────────────── */

export default function ObservabilityDashboardPage() {
  const { stats, costs, security, metrics, advisor, resources, loading, syncing, error, fetchAll, resync } = useTenantDataStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (loading) fetchAll();
  }, []);

  /* ── Overview KPIs ── */
  const overviewKpis = useMemo((): OverviewKpi[] => {
    const byType = stats?.by_type ?? {};
    const resourceSummary = stats?.resource_summary;
    const totalResources = stats?.total_resources ?? Object.values(byType).reduce((s: number, v) => s + (v as number), 0);
    const rgs = extractFromByType(stats, "resourceGroups");
    const vms = extractFromByType(stats, "virtualMachines");
    const storage = extractFromByType(stats, "storageAccounts");
    const dbs = resourceSummary?.sql_databases ?? extractFromByType(stats, "databases") ?? 0;
    const aks = extractFromByType(stats, "managedClusters");
    const advisorCount = advisor?.count ?? advisor?.recommendations?.length ?? 0;
    const secureScore = security?.secure_score_percentage != null ? `${Math.round(security.secure_score_percentage)}%` : "N/A";
    const subscriptionCount = Object.keys(stats?.by_location ?? {}).length > 0 ? "1" : "N/A";

    return [
      { label: "Total Resources", value: `${totalResources}`, icon: <Database className="h-4 w-4" />, color: "blue", subtitle: stats ? `Last sync: ${stats.synced_at ? new Date(stats.synced_at).toLocaleTimeString() : ""}` : "" },
      { label: "Resource Groups", value: `${rgs}`, icon: <Layers className="h-4 w-4" />, color: "green", subtitle: "Across all subscriptions" },
      { label: "Virtual Machines", value: `${vms}`, icon: <Cpu className="h-4 w-4" />, color: "purple", subtitle: metrics?.virtual_machines?.length ? `${metrics.virtual_machines.length} with metrics` : "" },
      { label: "Storage Accounts", value: `${storage}`, icon: <HardDrive className="h-4 w-4" />, color: "amber", subtitle: "Azure Blob & File Storage" },
      { label: "Databases", value: `${dbs}`, icon: <Database className="h-4 w-4" />, color: "red", subtitle: "SQL & Cosmos DB" },
      { label: "AKS Clusters", value: `${aks}`, icon: <Container className="h-4 w-4" />, color: "cyan", subtitle: "Managed Kubernetes" },
      { label: "Azure Advisor", value: `${advisorCount}`, icon: <Shield className="h-4 w-4" />, color: "gray", subtitle: `${advisorCount > 0 ? "Recommendations available" : "No recommendations"}` },
      { label: "Secure Score", value: `${secureScore}`, icon: <CheckCircle className="h-4 w-4" />, color: "green", subtitle: "Microsoft Defender for Cloud" },
      { label: "Subscriptions", value: subscriptionCount, icon: <Globe className="h-4 w-4" />, color: "blue", subtitle: "Active Azure subscriptions" },
      { label: "Azure Users", value: "N/A", icon: <Users className="h-4 w-4" />, color: "gray", subtitle: "Requires Graph API access" },
    ];
  }, [stats, security, advisor, metrics]);

  /* ── Chart data ── */
  const chartContext = useMemo((): ChartContext => ({
    cpuTrend: computeCpuTrend(metrics),
    resourceDist: computeResourceDist(stats),
    memByVm: computeMemByVm(metrics),
    networkData: computeNetworkThroughput(metrics),
    storageTier: computeStorageTier(resources),
    alertData: computeAlertSeverity(security),
  }), [stats, metrics, security, resources]);

  const tableRows = useMemo(() => computeTableRows(resources, metrics), [resources, metrics]);

  /* ── Draggable / Resizable state ── */
  const [minimized, setMinimized] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const gridRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>({ chartId: null, startX: 0, startY: 0, origX: 0, origY: 0 });
  const resizeRef = useRef<ResizeState>({ chartId: null, startX: 0, startY: 0, origW: 0, origH: 0 });
  const GRID_GAP = 16;
  const CHART_W = 300;
  const CHART_H = 250;
  const MIN_W = 220;
  const MIN_H = 180;

  useEffect(() => {
    const cols = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
    const newPositions: Record<string, { x: number; y: number }> = {};
    const newSizes: Record<string, { w: number; h: number }> = {};
    chartConfigs.forEach((cfg, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      newPositions[cfg.id] = { x: col * (CHART_W + GRID_GAP), y: row * (CHART_H + GRID_GAP) };
      newSizes[cfg.id] = sizes[cfg.id] ?? { w: CHART_W, h: CHART_H };
    });
    setPositions(newPositions);
    setSizes(newSizes);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current.chartId) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPositions((prev) => ({
          ...prev,
          [dragRef.current.chartId!]: { x: Math.max(0, dragRef.current.origX + dx), y: Math.max(0, dragRef.current.origY + dy) },
        }));
      }
      if (resizeRef.current.chartId) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        setSizes((prev) => ({
          ...prev,
          [resizeRef.current.chartId!]: { w: Math.max(MIN_W, resizeRef.current.origW + dx), h: Math.max(MIN_H, resizeRef.current.origH + dy) },
        }));
      }
    };
    const handleMouseUp = () => { dragRef.current.chartId = null; resizeRef.current.chartId = null; };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
  }, []);

  const handleDragStart = (e: React.MouseEvent, chartId: string) => {
    dragRef.current = { chartId, startX: e.clientX, startY: e.clientY, origX: positions[chartId]?.x ?? 0, origY: positions[chartId]?.y ?? 0 };
  };
  const handleResizeStart = (e: React.MouseEvent, chartId: string) => {
    resizeRef.current = { chartId, startX: e.clientX, startY: e.clientY, origW: sizes[chartId]?.w ?? CHART_W, origH: sizes[chartId]?.h ?? CHART_H };
  };
  const toggleMinimized = (id: string) => setMinimized((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleResync = useCallback(async () => {
    addNotification({ title: "Resyncing...", message: "Refreshing Azure Monitor, Log Analytics, Resource Graph, Advisor & Defender data", status: "info", category: "tenant_sync" });
    await resync();
    addNotification({ title: "Resync complete", message: "All observability data refreshed", status: "success", category: "tenant_sync" });
  }, [resync, addNotification]);

  const handleExport = async (format: string) => {
    if (format === "CSV") {
      const header = EXPORT_CSV_COLUMNS.join(",");
      const tableRowsStr = tableRows.map(r => `${r.name},${r.type},${r.cpu},${r.memory},${r.status},${r.region}`);
      const csv = [`Observability Export — ${new Date().toLocaleString()}`, header, ...tableRowsStr].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `observability_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const el = dashboardRef.current;
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false });
    if (format === "PNG") {
      const link = document.createElement("a");
      link.download = `observability_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } else if (format === "PDF") {
      const imgData = canvas.toDataURL("image/png");
      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(`<html><head><title>Observability</title><style>body{margin:0;display:flex;justify-content:center}img{max-width:100%;height:auto}</style></head><body><img src="${imgData}" onload="window.print();window.close()" /></body></html>`);
        printWin.document.close();
      }
    }
  };

  const [exportOpen, setExportOpen] = useState(false);
  const gridHeight = Math.ceil(chartConfigs.length / 3) * (CHART_H + GRID_GAP) - GRID_GAP;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator userName="Harsh Pardhi" />

        <main className="p-4 lg:p-5">
          <div ref={dashboardRef} className="max-w-7xl mx-auto">
            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Observability Agent</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Real-time monitoring and analytics from Azure Monitor, Resource Graph, Advisor & Defender.
                  {stats?.synced_at && (
                    <span className="ml-2 text-xs text-gray-400">Last sync: {new Date(stats.synced_at).toLocaleString()}</span>
                  )}
                </p>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResync}
                  disabled={syncing || loading}
                  className="h-8 text-xs gap-1.5"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                  {syncing ? "Resyncing..." : "Resync"}
                </Button>
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setExportOpen(!exportOpen)} className="h-8 text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Export
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <AnimatePresence>
                    {exportOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 mt-1 w-40 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-50 overflow-hidden"
                      >
                        {["PNG", "PDF", "CSV"].map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => { setExportOpen(false); handleExport(fmt); }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Export as {fmt}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ── Tenant Overview KPIs ── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <LayoutDashboard className="h-4 w-4 text-azure-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Tenant Overview</h2>
                {loading && <span className="text-[10px] text-gray-400">Loading...</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {overviewKpis.map((kpi, i) => (
                  <OverviewKpiCard key={kpi.label} data={kpi} index={i} />
                ))}
              </div>
            </div>

            {/* ── Charts ── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-azure-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monitoring Charts</h2>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Drag to rearrange · Resize from bottom-right</span>
              </div>
              <div ref={gridRef} className="relative" style={{ height: `${gridHeight}px`, minHeight: "520px" }}>
                {chartConfigs.map((cfg) => {
                  const pos = positions[cfg.id] ?? { x: 0, y: 0 };
                  const sz = sizes[cfg.id] ?? { w: CHART_W, h: CHART_H };
                  return (
                    <ChartCard
                      key={cfg.id}
                      id={cfg.id}
                      title={cfg.title}
                      icon={cfg.icon}
                      chartContext={chartContext}
                      minimized={!!minimized[cfg.id]}
                      onToggleMinimize={() => toggleMinimized(cfg.id)}
                      position={pos}
                      onDragStart={handleDragStart}
                      size={sz}
                      onResizeStart={handleResizeStart}
                    />
                  );
                })}
              </div>
            </div>

            {/* ── Resource Summary Table ── */}
            <DataTable rows={tableRows} />
          </div>
        </main>
      </div>
    </div>
  );
}