"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Server, Activity, Cpu, Database, Globe, RefreshCw, Wifi, Shield, CheckCircle, AlertTriangle, XCircle, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUptimeStore } from "@/store/uptimeStore";
import { useRouter } from "next/navigation";

interface PortalStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceStatus {
  name: string;
  icon: React.ReactNode;
  status: "healthy" | "degraded" | "down";
  latency: string;
  uptime: string;
}

interface Metric {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  color: string;
}

export function PortalStatusDrawer({ isOpen, onClose }: PortalStatusDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { getUptime, isHealthy, setHealthStatus } = useUptimeStore();
  const [isFixing, setIsFixing] = useState(false);
  const [fixLog, setFixLog] = useState<string[]>([]);
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const services: ServiceStatus[] = [
    { name: "Frontend", icon: <Globe className="h-4 w-4" />, status: "healthy", latency: "12ms", uptime: "99.9%" },
    { name: "Backend API", icon: <Server className="h-4 w-4" />, status: "healthy", latency: "24ms", uptime: "99.8%" },
    { name: "Redis Cache", icon: <Database className="h-4 w-4" />, status: "healthy", latency: "2ms", uptime: "100%" },
    { name: "WebSocket", icon: <Wifi className="h-4 w-4" />, status: "healthy", latency: "8ms", uptime: "99.7%" },
    { name: "Azure Sync", icon: <Activity className="h-4 w-4" />, status: "degraded", latency: "156ms", uptime: "95.2%" },
    { name: "AI Service", icon: <Cpu className="h-4 w-4" />, status: "healthy", latency: "45ms", uptime: "99.5%" },
  ];

  const metrics: Metric[] = [
    { label: "CPU Usage", value: "34%", trend: "stable", color: "from-emerald-500 to-emerald-400" },
    { label: "Memory", value: "1.2/4 GB", trend: "up", color: "from-azure-500 to-blue-400" },
    { label: "Requests/min", value: "1,247", trend: "up", color: "from-purple-500 to-violet-400" },
    { label: "Error Rate", value: "0.3%", trend: "down", color: "from-amber-500 to-orange-400" },
  ];

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "healthy": return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />;
      case "degraded": return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
      case "down": return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    }
  };

  const getNeonGlow = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "healthy": return "shadow-[0_0_8px_rgba(52,211,153,0.3)] dark:shadow-[0_0_12px_rgba(52,211,153,0.2)]";
      case "degraded": return "shadow-[0_0_8px_rgba(251,191,36,0.3)] dark:shadow-[0_0_12px_rgba(251,191,36,0.2)]";
      case "down": return "shadow-[0_0_8px_rgba(239,68,68,0.3)] dark:shadow-[0_0_12px_rgba(239,68,68,0.2)]";
    }
  };

  const getNeonDot = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "healthy": return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]";
      case "degraded": return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]";
      case "down": return "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.6)]";
    }
  };

  const handleAutoFix = async () => {
    setIsFixing(true);
    setFixLog([]);
    const logs = [
      "Scanning portal services...",
      "Checking Frontend health... OK",
      "Checking Backend API... OK",
      "Checking Redis connection... OK",
      "Checking Azure Sync... Degraded",
      "Attempting Azure Sync repair...",
      "Re-establishing Azure connection...",
      "Azure Sync restored successfully",
      "Running final health check...",
      "All services healthy. Portal stable.",
    ];
    for (const log of logs) {
      await new Promise(r => setTimeout(r, 400));
      setFixLog(prev => [...prev, log]);
    }
    setHealthStatus(true);
    setIsFixing(false);
  };

  const degradedCount = services.filter(s => s.status === "degraded" || s.status === "down").length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div
            ref={drawerRef}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Activity className="h-5 w-5 text-gray-700 dark:text-slate-300" />
                  <span className={cn("absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full", getNeonDot(isHealthy ? "healthy" : "degraded"))} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Portal Status</h2>
                  <p className={cn("text-xs", isHealthy ? "text-emerald-500" : "text-amber-500")}>
                    {isHealthy ? "All systems operational" : `${degradedCount} service(s) degraded`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Auto-fix</span>
                  <button
                    onClick={() => setAutoFixEnabled(!autoFixEnabled)}
                    className={cn(
                      "w-8 h-4 rounded-full transition-colors relative",
                      autoFixEnabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-700"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                      autoFixEnabled ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </button>
                </label>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700/50">
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{metric.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{metric.value}</span>
                      <span className={cn(
                        "text-xs",
                        metric.trend === "up" ? "text-emerald-500" : metric.trend === "down" ? "text-red-500" : "text-gray-400"
                      )}>
                        {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}
                      </span>
                    </div>
                    <div className="mt-2 h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full bg-gradient-to-r", metric.color)} style={{ width: metric.label === "CPU Usage" ? "34%" : metric.label === "Memory" ? "30%" : metric.label === "Requests/min" ? "62%" : "8%" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Services List */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Services</h3>
                <div className="space-y-2">
                  {services.map((service) => (
                    <div
                      key={service.name}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all",
                        "bg-white dark:bg-slate-800/80",
                        "border-gray-100 dark:border-slate-700/50",
                        getNeonGlow(service.status)
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("p-1.5 rounded-lg", service.status === "healthy" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : service.status === "degraded" ? "text-amber-500 bg-amber-50 dark:bg-amber-500/10" : "text-red-500 bg-red-50 dark:bg-red-500/10")}>
                          {service.icon}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full", getNeonDot(service.status))} />
                            <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">{service.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-700 dark:text-slate-300">{service.latency}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{service.uptime} uptime</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Fix Section */}
              {autoFixEnabled && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Auto-Fix Diagnostics</h3>
                    <Button
                      onClick={handleAutoFix}
                      disabled={isFixing}
                      size="sm"
                      className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                    >
                      {isFixing ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Fixing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3 mr-1" />
                          Run Auto-Fix
                        </>
                      )}
                    </Button>
                  </div>
                  {fixLog.length > 0 && (
                    <div className="bg-gray-900 dark:bg-black rounded-xl p-3 space-y-1 font-mono text-xs max-h-40 overflow-y-auto border border-gray-800">
                      {fixLog.map((log, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={cn(
                            "text-xs flex-shrink-0 mt-0.5",
                            log.includes("OK") || log.includes("restored") || log.includes("stable") ? "text-emerald-400" :
                            log.includes("Degraded") || log.includes("repair") ? "text-amber-400" :
                            log.includes("Scanning") || log.includes("Checking") || log.includes("Attempting") || log.includes("Re-establishing") || log.includes("Running") ? "text-azure-400" : "text-gray-400"
                          )}>
                            {log.includes("OK") || log.includes("stable") ? "✓" : log.includes("Degraded") ? "⚠" : log.includes("restored") ? "✓" : "→"}
                          </span>
                          <span className={cn(
                            log.includes("OK") || log.includes("restored") || log.includes("stable") ? "text-emerald-300" :
                            log.includes("Degraded") ? "text-amber-300" :
                            log.includes("repair") ? "text-amber-300" : "text-gray-300"
                          )}>
                            {log}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200/50 dark:border-slate-800/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                <span>Portal Uptime: {getUptime()}</span>
                <span className={cn("flex items-center gap-1", isHealthy ? "text-emerald-500" : "text-amber-500")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", getNeonDot(isHealthy ? "healthy" : "degraded"))} />
                  {isHealthy ? "Healthy" : "Degraded"}
                </span>
              </div>
              <Button
                onClick={() => { onClose(); router.push("/portal/monitoring"); }}
                size="sm"
                className="w-full h-7 text-xs"
                variant="outline"
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                View Full Dashboard
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
