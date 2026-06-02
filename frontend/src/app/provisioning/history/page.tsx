"use client";

import { useState, useMemo } from "react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Server, Database, Container, Cloud, Layers, Network,
  ArrowLeft, Search, ChevronUp, ChevronDown,
  CheckCircle, Activity, XCircle, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

type Deployment = {
  name: string;
  type: string;
  status: "completed" | "in-progress" | "failed";
  dateTime: string;
  initiatedBy: string;
};

const mockDeployments: Deployment[] = [
  { name: "prod-web-vm-001", type: "Virtual Machine", status: "completed", dateTime: "2026-05-28 14:32", initiatedBy: "Harsh Pardhi" },
  { name: "dev-storage-acc", type: "Storage Account", status: "completed", dateTime: "2026-05-28 11:15", initiatedBy: "Priya Sharma" },
  { name: "staging-aks-cluster", type: "AKS Cluster", status: "in-progress", dateTime: "2026-05-28 09:00", initiatedBy: "Rahul Verma" },
  { name: "prod-app-service", type: "App Service", status: "completed", dateTime: "2026-05-27 16:45", initiatedBy: "Harsh Pardhi" },
  { name: "core-rg-prod", type: "Resource Group", status: "completed", dateTime: "2026-05-27 14:20", initiatedBy: "Ananya Gupta" },
  { name: "vnet-hub-prod", type: "Networking", status: "completed", dateTime: "2026-05-27 12:10", initiatedBy: "Vikram Singh" },
  { name: "analytics-db", type: "Database", status: "failed", dateTime: "2026-05-27 10:30", initiatedBy: "Priya Sharma" },
  { name: "dev-web-vm-002", type: "Virtual Machine", status: "completed", dateTime: "2026-05-26 15:00", initiatedBy: "Rahul Verma" },
  { name: "logging-storage", type: "Storage Account", status: "in-progress", dateTime: "2026-05-26 11:00", initiatedBy: "Harsh Pardhi" },
];

const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  "Virtual Machine": { icon: <Server className="h-4 w-4" />, color: "text-purple-500" },
  "Storage Account": { icon: <Database className="h-4 w-4" />, color: "text-green-500" },
  "AKS Cluster": { icon: <Container className="h-4 w-4" />, color: "text-indigo-500" },
  "App Service": { icon: <Cloud className="h-4 w-4" />, color: "text-cyan-500" },
  "Resource Group": { icon: <Layers className="h-4 w-4" />, color: "text-blue-500" },
  "Networking": { icon: <Network className="h-4 w-4" />, color: "text-amber-500" },
  "Database": { icon: <Database className="h-4 w-4" />, color: "text-rose-500" },
};

const statusConfig = {
  "completed": { icon: CheckCircle, className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  "in-progress": { icon: Activity, className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  "failed": { icon: XCircle, className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
};

type SortKey = keyof Deployment;
type SortDir = "asc" | "desc";

export default function ProvisioningHistoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dateTime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockDeployments.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q) ||
      d.status.toLowerCase().includes(q) ||
      d.initiatedBy.toLowerCase().includes(q)
    );
  }, [search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ column, label }: { column: SortKey; label: string }) => (
    <th
      className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === column ? (
          sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3 opacity-0" />
        )}
      </div>
    </th>
  );

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/provisioning")}
              className="h-8 px-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Provisioning Agent</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Deployment History</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push("/provisioning/chat")}
            className="h-8 bg-azure-500 hover:bg-azure-600"
          >
            New Deployment
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <Input
              placeholder="Search deployments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-slate-500">{sorted.length} deployments</span>
        </div>

        <div className="border border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <SortHeader column="name" label="Deployment Name" />
                  <SortHeader column="type" label="Type" />
                  <SortHeader column="status" label="Status" />
                  <SortHeader column="dateTime" label="Date/Time" />
                  <SortHeader column="initiatedBy" label="Initiated By" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((deployment, index) => {
                  const typeInfo = typeIcons[deployment.type] || typeIcons["Virtual Machine"];
                  const statusInfo = statusConfig[deployment.status];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <motion.tr
                      key={deployment.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{deployment.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("flex-shrink-0", typeInfo.color)}>{typeInfo.icon}</span>
                          <span className="text-sm text-gray-600 dark:text-slate-300">{deployment.type}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", statusInfo.className)}>
                          <StatusIcon className={cn("h-3 w-3", deployment.status === "in-progress" && "animate-pulse")} />
                          {deployment.status === "in-progress" ? "In Progress" : deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          {deployment.dateTime}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{deployment.initiatedBy}</td>
                    </motion.tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-gray-400 dark:text-slate-500">
                      No deployments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
