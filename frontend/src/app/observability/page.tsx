"use client";

import { useState, useRef, useMemo, useEffect } from "react";
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
  TrendingUp, CheckCircle, X
} from "lucide-react";

/* ─────────────────────── Types ─────────────────────── */

interface KpiData {
  title: string; value: string; unit: string;
  color: string; icon: React.ReactNode;
  trend: string; trendUp: boolean;
}

interface ReportDataSet {
  kpis: KpiData[];
  cpuTrend: number[];
  resourceDist: { label: string; value: number; color: string }[];
  memByVm: { label: string; value: number; color: string }[];
  networkThroughput: number[];
  storageByTier: { label: string; used: number; total: number; color: string }[];
  alertSeverity: { label: string; value: number; color: string }[];
  tableRows: TableRow[];
}

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

/* ─────────────────────── Reports Data ─────────────────────── */

const reportOptions = [
  { id: "weekly", label: "Weekly Assessment Report" },
  { id: "monthly", label: "Monthly Assessment Report" },
  { id: "quarterly", label: "Quarterly Assessment Report" },
];

const reports: Record<string, ReportDataSet> = {
  weekly: {
    kpis: [
      { title: "Avg CPU", value: "45", unit: "%", color: "blue", icon: <Cpu className="h-4 w-4" />, trend: "+2.3%", trendUp: true },
      { title: "Memory Usage", value: "62", unit: "%", color: "purple", icon: <Server className="h-4 w-4" />, trend: "+1.8%", trendUp: true },
      { title: "Network IO", value: "1.2", unit: "GB/s", color: "green", icon: <Wifi className="h-4 w-4" />, trend: "-0.5%", trendUp: false },
      { title: "Storage Used", value: "3.4", unit: "TB", color: "amber", icon: <HardDrive className="h-4 w-4" />, trend: "+5.2%", trendUp: true },
      { title: "Active Alerts", value: "12", unit: "", color: "red", icon: <AlertTriangle className="h-4 w-4" />, trend: "-3", trendUp: false },
    ],
    cpuTrend: [42, 58, 35, 71, 49, 63],
    resourceDist: [
      { label: "Compute", value: 45, color: "#3b82f6" },
      { label: "Storage", value: 25, color: "#22c55e" },
      { label: "Network", value: 18, color: "#a855f7" },
      { label: "Database", value: 12, color: "#f59e0b" },
    ],
    memByVm: [
      { label: "web-01", value: 72, color: "#8b5cf6" },
      { label: "web-02", value: 55, color: "#8b5cf6" },
      { label: "db-01", value: 88, color: "#8b5cf6" },
      { label: "db-02", value: 44, color: "#8b5cf6" },
      { label: "app-01", value: 63, color: "#8b5cf6" },
      { label: "app-02", value: 51, color: "#8b5cf6" },
    ],
    networkThroughput: [30, 55, 72, 48, 85, 62, 90, 78, 45, 68, 82, 58],
    storageByTier: [
      { label: "Hot Tier", used: 820, total: 1000, color: "#3b82f6" },
      { label: "Cool Tier", used: 450, total: 1000, color: "#22c55e" },
      { label: "Archive", used: 210, total: 500, color: "#f59e0b" },
    ],
    alertSeverity: [
      { label: "Critical", value: 4, color: "#ef4444" },
      { label: "Warning", value: 7, color: "#f59e0b" },
      { label: "Info", value: 5, color: "#3b82f6" },
      { label: "Low", value: 3, color: "#6b7280" },
    ],
    tableRows: [
      { name: "prod-web-001", type: "Virtual Machine", cpu: 78, memory: 65, status: "healthy", region: "East US" },
      { name: "prod-db-001", type: "Azure SQL DB", cpu: 92, memory: 88, status: "warning", region: "East US" },
      { name: "prod-app-001", type: "App Service", cpu: 45, memory: 52, status: "healthy", region: "West Europe" },
      { name: "staging-web-01", type: "Virtual Machine", cpu: 23, memory: 34, status: "healthy", region: "Southeast Asia" },
      { name: "prod-cache-01", type: "Redis Cache", cpu: 61, memory: 72, status: "warning", region: "East US" },
      { name: "prod-func-01", type: "Function App", cpu: 15, memory: 28, status: "healthy", region: "West Europe" },
      { name: "prod-storage-primary", type: "Storage Account", cpu: 0, memory: 0, status: "healthy", region: "East US" },
      { name: "prod-cdn-endpoint", type: "CDN Profile", cpu: 0, memory: 0, status: "critical", region: "Global" },
      { name: "prod-aks-cluster", type: "Kubernetes", cpu: 67, memory: 71, status: "healthy", region: "East US" },
      { name: "dev-sbx-001", type: "Virtual Machine", cpu: 5, memory: 12, status: "healthy", region: "Central India" },
    ],
  },
  monthly: {
    kpis: [
      { title: "Avg CPU", value: "52", unit: "%", color: "blue", icon: <Cpu className="h-4 w-4" />, trend: "+5.1%", trendUp: true },
      { title: "Memory Usage", value: "71", unit: "%", color: "purple", icon: <Server className="h-4 w-4" />, trend: "+3.2%", trendUp: true },
      { title: "Network IO", value: "1.8", unit: "GB/s", color: "green", icon: <Wifi className="h-4 w-4" />, trend: "+8.7%", trendUp: true },
      { title: "Storage Used", value: "4.1", unit: "TB", color: "amber", icon: <HardDrive className="h-4 w-4" />, trend: "+12.4%", trendUp: true },
      { title: "Active Alerts", value: "28", unit: "", color: "red", icon: <AlertTriangle className="h-4 w-4" />, trend: "+16", trendUp: true },
    ],
    cpuTrend: [55, 62, 48, 73, 58, 68],
    resourceDist: [
      { label: "Compute", value: 48, color: "#3b82f6" },
      { label: "Storage", value: 22, color: "#22c55e" },
      { label: "Network", value: 16, color: "#a855f7" },
      { label: "Database", value: 14, color: "#f59e0b" },
    ],
    memByVm: [
      { label: "web-01", value: 82, color: "#8b5cf6" },
      { label: "web-02", value: 65, color: "#8b5cf6" },
      { label: "db-01", value: 94, color: "#8b5cf6" },
      { label: "db-02", value: 52, color: "#8b5cf6" },
      { label: "app-01", value: 73, color: "#8b5cf6" },
      { label: "app-02", value: 58, color: "#8b5cf6" },
    ],
    networkThroughput: [40, 62, 78, 55, 88, 70, 95, 82, 50, 72, 86, 64],
    storageByTier: [
      { label: "Hot Tier", used: 920, total: 1000, color: "#3b82f6" },
      { label: "Cool Tier", used: 580, total: 1000, color: "#22c55e" },
      { label: "Archive", used: 340, total: 500, color: "#f59e0b" },
    ],
    alertSeverity: [
      { label: "Critical", value: 8, color: "#ef4444" },
      { label: "Warning", value: 15, color: "#f59e0b" },
      { label: "Info", value: 10, color: "#3b82f6" },
      { label: "Low", value: 6, color: "#6b7280" },
    ],
    tableRows: [
      { name: "prod-web-001", type: "Virtual Machine", cpu: 85, memory: 72, status: "warning", region: "East US" },
      { name: "prod-db-001", type: "Azure SQL DB", cpu: 95, memory: 92, status: "critical", region: "East US" },
      { name: "prod-app-001", type: "App Service", cpu: 52, memory: 58, status: "healthy", region: "West Europe" },
      { name: "staging-web-01", type: "Virtual Machine", cpu: 30, memory: 42, status: "healthy", region: "Southeast Asia" },
      { name: "prod-cache-01", type: "Redis Cache", cpu: 72, memory: 81, status: "warning", region: "East US" },
      { name: "prod-func-01", type: "Function App", cpu: 22, memory: 35, status: "healthy", region: "West Europe" },
      { name: "prod-storage-primary", type: "Storage Account", cpu: 0, memory: 0, status: "healthy", region: "East US" },
      { name: "prod-cdn-endpoint", type: "CDN Profile", cpu: 0, memory: 0, status: "critical", region: "Global" },
      { name: "prod-aks-cluster", type: "Kubernetes", cpu: 75, memory: 79, status: "warning", region: "East US" },
      { name: "dev-sbx-001", type: "Virtual Machine", cpu: 8, memory: 15, status: "healthy", region: "Central India" },
      { name: "prod-sql-002", type: "Azure SQL DB", cpu: 44, memory: 51, status: "healthy", region: "North Europe" },
    ],
  },
  quarterly: {
    kpis: [
      { title: "Avg CPU", value: "38", unit: "%", color: "blue", icon: <Cpu className="h-4 w-4" />, trend: "-4.2%", trendUp: false },
      { title: "Memory Usage", value: "55", unit: "%", color: "purple", icon: <Server className="h-4 w-4" />, trend: "-2.1%", trendUp: false },
      { title: "Network IO", value: "0.9", unit: "GB/s", color: "green", icon: <Wifi className="h-4 w-4" />, trend: "-12.3%", trendUp: false },
      { title: "Storage Used", value: "2.8", unit: "TB", color: "amber", icon: <HardDrive className="h-4 w-4" />, trend: "+3.1%", trendUp: true },
      { title: "Active Alerts", value: "6", unit: "", color: "red", icon: <AlertTriangle className="h-4 w-4" />, trend: "-6", trendUp: false },
    ],
    cpuTrend: [35, 42, 28, 58, 38, 45],
    resourceDist: [
      { label: "Compute", value: 40, color: "#3b82f6" },
      { label: "Storage", value: 30, color: "#22c55e" },
      { label: "Network", value: 20, color: "#a855f7" },
      { label: "Database", value: 10, color: "#f59e0b" },
    ],
    memByVm: [
      { label: "web-01", value: 58, color: "#8b5cf6" },
      { label: "web-02", value: 42, color: "#8b5cf6" },
      { label: "db-01", value: 72, color: "#8b5cf6" },
      { label: "db-02", value: 38, color: "#8b5cf6" },
      { label: "app-01", value: 55, color: "#8b5cf6" },
      { label: "app-02", value: 44, color: "#8b5cf6" },
    ],
    networkThroughput: [25, 45, 60, 38, 72, 52, 78, 65, 35, 58, 70, 48],
    storageByTier: [
      { label: "Hot Tier", used: 750, total: 1000, color: "#3b82f6" },
      { label: "Cool Tier", used: 380, total: 1000, color: "#22c55e" },
      { label: "Archive", used: 180, total: 500, color: "#f59e0b" },
    ],
    alertSeverity: [
      { label: "Critical", value: 1, color: "#ef4444" },
      { label: "Warning", value: 3, color: "#f59e0b" },
      { label: "Info", value: 2, color: "#3b82f6" },
      { label: "Low", value: 1, color: "#6b7280" },
    ],
    tableRows: [
      { name: "prod-web-001", type: "Virtual Machine", cpu: 52, memory: 48, status: "healthy", region: "East US" },
      { name: "prod-db-001", type: "Azure SQL DB", cpu: 68, memory: 72, status: "healthy", region: "East US" },
      { name: "prod-app-001", type: "App Service", cpu: 32, memory: 40, status: "healthy", region: "West Europe" },
      { name: "staging-web-01", type: "Virtual Machine", cpu: 15, memory: 22, status: "healthy", region: "Southeast Asia" },
      { name: "prod-cache-01", type: "Redis Cache", cpu: 48, memory: 55, status: "healthy", region: "East US" },
    ],
  },
};

/* ─────────────────────── Pure CSS Chart Components ─────────────────────── */

function HorizontalBarChart({ data, maxValue, color }: { data: number[]; maxValue: number; color: string }) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="space-y-2">
      {data.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 dark:text-slate-400 w-7 text-right flex-shrink-0">{labels[i]}</span>
          <div className="flex-1 bg-gray-100 dark:bg-slate-700/60 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(val / maxValue) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
          <span className="text-[11px] font-medium text-gray-700 dark:text-slate-300 w-8 text-right flex-shrink-0">{val}%</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cumulative = 0;
  const segments = data.map((d) => {
    const start = (cumulative / total) * 360;
    cumulative += d.value;
    const end = (cumulative / total) * 360;
    return { ...d, start, end };
  });
  const gradient = segments.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(", ");

  return (
    <div className="flex items-center gap-4 h-full">
      <div className="relative w-24 h-24 flex-shrink-0">
        <div
          className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        />
        <div className="absolute inset-[14px] bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900 dark:text-white">{total}</span>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[11px] text-gray-600 dark:text-slate-400">{d.label}</span>
            <span className="text-[11px] font-medium text-gray-900 dark:text-white ml-auto">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColumnChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-around h-32 gap-1">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1 flex-1 max-w-[44px]">
          <span className="text-[10px] font-medium text-gray-700 dark:text-slate-300">{d.value}%</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.value / max) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-7 rounded-t-md"
            style={{ backgroundColor: d.color }}
          />
          <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function LineChartApprox({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 40;
  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((val - min) / range) * h,
    val,
  }));
  const pointStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="h-32 relative">
      <svg className="w-full h-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={pointStr} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-500 dark:text-slate-400">0s</span>
        <span className="text-[10px] text-gray-500 dark:text-slate-400">{max}%</span>
      </div>
    </div>
  );
}

function StackedBarChart({ data }: { data: { label: string; used: number; total: number; color: string }[] }) {
  return (
    <div className="space-y-3">
      {data.map((tier) => (
        <div key={tier.label}>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-gray-600 dark:text-slate-400">{tier.label}</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {tier.used} / {tier.total} GB
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700/60 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(tier.used / tier.total) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: tier.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertSeverityChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-around h-32">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1 flex-1 max-w-[52px]">
          <span className="text-[10px] font-medium text-gray-700 dark:text-slate-300">{d.value}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.value / max) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-8 rounded-t-md"
            style={{ backgroundColor: d.color }}
          />
          <span className="text-[10px] text-gray-500 dark:text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────── Chart Config ─────────────────────── */

interface ChartConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  chart: (data: ReportDataSet) => React.ReactNode;
}

const chartConfigs: ChartConfig[] = [
  { id: "cpu-trend", title: "CPU Usage Trend", icon: <Cpu className="h-3.5 w-3.5" />, chart: (d) => <HorizontalBarChart data={d.cpuTrend} maxValue={100} color="#3b82f6" /> },
  { id: "resource-dist", title: "Resource Distribution", icon: <Activity className="h-3.5 w-3.5" />, chart: (d) => <DonutChart data={d.resourceDist} /> },
  { id: "mem-by-vm", title: "Memory Usage by VM", icon: <Server className="h-3.5 w-3.5" />, chart: (d) => <ColumnChart data={d.memByVm} /> },
  { id: "network-throughput", title: "Network Throughput", icon: <Wifi className="h-3.5 w-3.5" />, chart: (d) => <LineChartApprox data={d.networkThroughput} color="#22c55e" /> },
  { id: "storage-by-tier", title: "Storage by Tier", icon: <HardDrive className="h-3.5 w-3.5" />, chart: (d) => <StackedBarChart data={d.storageByTier} /> },
  { id: "alert-severity", title: "Alert Severity", icon: <AlertTriangle className="h-3.5 w-3.5" />, chart: (d) => <AlertSeverityChart data={d.alertSeverity} /> },
];

/* ─────────────────────── Draggable/Resizable Chart Card ─────────────────────── */

function ChartCard({
  id, title, icon, reportData, minimized, onToggleMinimize,
  position, onDragStart,
  size, onResizeStart,
}: {
  id: string; title: string; icon: React.ReactNode;
  reportData: ReportDataSet;
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
            <div className="p-3">{cfg.chart(reportData)}</div>
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

/* ─────────────────────── KPI Card ─────────────────────── */

function KpiCard({ data, index }: { data: KpiData; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
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
        )}>
          {data.icon}
        </div>
        <span className="text-xs text-gray-500 dark:text-slate-400">{data.title}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {data.value}{data.unit && <span className="text-sm font-normal text-gray-400 dark:text-slate-500 ml-0.5">{data.unit}</span>}
      </p>
      <p className={cn(
        "text-xs font-medium",
        data.trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      )}>
        {data.trendUp ? "\u2191" : "\u2193"} {data.trend}
      </p>
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

function DataTable({ rows }: { rows: TableRow[] }) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let data = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.region.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
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
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </div>
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
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.cpu}%`, backgroundColor: row.cpu > 80 ? "#ef4444" : row.cpu > 50 ? "#f59e0b" : "#22c55e" }}
                      />
                    </div>
                    {row.cpu}%
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-slate-300 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.memory}%`, backgroundColor: row.memory > 80 ? "#ef4444" : row.memory > 50 ? "#f59e0b" : "#22c55e" }}
                      />
                    </div>
                    {row.memory}%
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", statusColor[row.status])}>
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-slate-400 whitespace-nowrap">{row.region}</td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-gray-400 dark:text-slate-500">
                  No resources match your filter.
                </td>
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
  const [selectedReport, setSelectedReport] = useState("weekly");
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const data = reports[selectedReport];

  const [minimized, setMinimized] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});

  const gridRef = useRef<HTMLDivElement>(null);

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
          [dragRef.current.chartId!]: {
            x: Math.max(0, dragRef.current.origX + dx),
            y: Math.max(0, dragRef.current.origY + dy),
          },
        }));
      }
      if (resizeRef.current.chartId) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        setSizes((prev) => ({
          ...prev,
          [resizeRef.current.chartId!]: {
            w: Math.max(MIN_W, resizeRef.current.origW + dx),
            h: Math.max(MIN_H, resizeRef.current.origH + dy),
          },
        }));
      }
    };
    const handleMouseUp = () => {
      dragRef.current.chartId = null;
      resizeRef.current.chartId = null;
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleDragStart = (e: React.MouseEvent, chartId: string) => {
    dragRef.current = {
      chartId,
      startX: e.clientX,
      startY: e.clientY,
      origX: positions[chartId]?.x ?? 0,
      origY: positions[chartId]?.y ?? 0,
    };
  };

  const handleResizeStart = (e: React.MouseEvent, chartId: string) => {
    resizeRef.current = {
      chartId,
      startX: e.clientX,
      startY: e.clientY,
      origW: sizes[chartId]?.w ?? CHART_W,
      origH: sizes[chartId]?.h ?? CHART_H,
    };
  };

  const toggleMinimized = (id: string) => {
    setMinimized((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentReportLabel = reportOptions.find((r) => r.id === selectedReport)?.label ?? "Select Report";

  const handleExport = (format: string) => {
    setExportOpen(false);
    alert(`Exporting dashboard as ${format}`);
  };

  const gridHeight = Math.ceil(chartConfigs.length / 3) * (CHART_H + GRID_GAP) - GRID_GAP;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />

      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator userName="Harsh Pardhi" />

        <main className="p-4 lg:p-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Observability Agent</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Real-time monitoring and analytics for your Azure infrastructure.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReportDropdownOpen(!reportDropdownOpen)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    {currentReportLabel}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <AnimatePresence>
                    {reportDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 mt-1 w-56 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-50 overflow-hidden"
                      >
                        {reportOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => { setSelectedReport(opt.id); setReportDropdownOpen(false); }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors",
                              selectedReport === opt.id
                                ? "text-azure-600 dark:text-azure-400 font-semibold bg-azure-50 dark:bg-azure-900/20"
                                : "text-gray-700 dark:text-slate-300"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExportOpen(!exportOpen)}
                    className="h-8 text-xs gap-1.5"
                  >
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
                            onClick={() => handleExport(fmt)}
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
              {data.kpis.map((kpi, i) => (
                <KpiCard key={kpi.title} data={kpi} index={i} />
              ))}
            </div>

            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-azure-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monitoring Charts</h2>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Drag to rearrange · Resize from bottom-right</span>
              </div>
              <div
                ref={gridRef}
                className="relative"
                style={{ height: `${gridHeight}px`, minHeight: "520px" }}
              >
                {chartConfigs.map((cfg) => {
                  const pos = positions[cfg.id] ?? { x: 0, y: 0 };
                  const sz = sizes[cfg.id] ?? { w: CHART_W, h: CHART_H };
                  return (
                    <ChartCard
                      key={cfg.id}
                      id={cfg.id}
                      title={cfg.title}
                      icon={cfg.icon}
                      reportData={data}
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

            <DataTable rows={data.tableRows} />
          </div>
        </main>
      </div>
    </div>
  );
}
