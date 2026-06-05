"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Server, Database, Cloud, Container, HardDrive, Globe,
  ArrowLeft, Search, ChevronUp, ChevronDown, Download,
  CheckCircle, Activity, XCircle, Clock, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMigrationStore } from "@/store/migrationStore";

type Migration = {
  name: string;
  type: string;
  status: "completed" | "in-progress" | "failed" | "planned";
  dateTime: string;
  duration: string;
  initiatedBy: string;
};

const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  "Lift & Shift": { icon: <Server className="h-4 w-4" />, color: "text-blue-500" },
  "Database Migration": { icon: <Database className="h-4 w-4" />, color: "text-green-500" },
  "Replatform": { icon: <Container className="h-4 w-4" />, color: "text-purple-500" },
  "Storage Migration": { icon: <HardDrive className="h-4 w-4" />, color: "text-amber-500" },
  "App Migration": { icon: <Cloud className="h-4 w-4" />, color: "text-indigo-500" },
  "Network Migration": { icon: <Globe className="h-4 w-4" />, color: "text-cyan-500" },
  "Container Migration": { icon: <Container className="h-4 w-4" />, color: "text-rose-500" },
  "Hybrid Setup": { icon: <Globe className="h-4 w-4" />, color: "text-cyan-500" },
};

const statusConfig = {
  "completed": { icon: CheckCircle, className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  "in-progress": { icon: Activity, className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  "failed": { icon: XCircle, className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
  "planned": { icon: Clock, className: "bg-gray-100 dark:bg-slate-700/50 text-gray-600 dark:text-slate-400" },
};

const ITEMS_PER_PAGE = 10;

type SortKey = keyof Migration;
type SortDir = "asc" | "desc";

export default function MigrationHistoryPage() {
  const router = useRouter();
  const storedMigrations = useMigrationStore((s) => s.migrations);
  const [migrationList, setMigrationList] = useState<Migration[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dateTime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (storedMigrations.length > 0) {
      setMigrationList(storedMigrations);
    }
  }, [storedMigrations]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return migrationList.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q) ||
      m.status.toLowerCase().includes(q) ||
      m.initiatedBy.toLowerCase().includes(q)
    );
  }, [search, migrationList]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const handleExport = (format: string) => {
    setExportOpen(false);
    if (format === "CSV") {
      const headers = ["Migration Name", "Type", "Status", "Date/Time", "Duration", "Initiated By"];
      const rows = sorted.map((m) => [m.name, m.type, m.status, m.dateTime, m.duration, m.initiatedBy]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `migrations_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert(`Export as ${format} coming soon`);
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
              onClick={() => router.push("/migration")}
              className="h-8 px-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Migration Agent</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Migration History</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={exportRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(!exportOpen)}
                className="h-8"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {exportOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10 overflow-hidden"
                >
                  <button
                    onClick={() => handleExport("CSV")}
                    className="w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport("PDF")}
                    className="w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                  >
                    Export as PDF
                  </button>
                </motion.div>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => router.push("/migration/chat")}
              className="h-8 bg-azure-500 hover:bg-azure-600"
            >
              New Migration
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <Input
              placeholder="Search migrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-slate-500">{sorted.length} migrations</span>
        </div>

        <div className="border border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <SortHeader column="name" label="Migration Name" />
                  <SortHeader column="type" label="Type" />
                  <SortHeader column="status" label="Status" />
                  <SortHeader column="dateTime" label="Date/Time" />
                  <SortHeader column="duration" label="Duration" />
                  <SortHeader column="initiatedBy" label="Initiated By" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((migration, index) => {
                  const typeInfo = typeIcons[migration.type] || typeIcons["Lift & Shift"];
                  const statusInfo = statusConfig[migration.status];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <motion.tr
                      key={migration.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{migration.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("flex-shrink-0", typeInfo.color)}>{typeInfo.icon}</span>
                          <span className="text-sm text-gray-600 dark:text-slate-300">{migration.type}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", statusInfo.className)}>
                          <StatusIcon className={cn("h-3 w-3", migration.status === "in-progress" && "animate-pulse")} />
                          {migration.status === "in-progress" ? "In Progress" : migration.status.charAt(0).toUpperCase() + migration.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          {migration.dateTime}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{migration.duration}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{migration.initiatedBy}</td>
                    </motion.tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400 dark:text-slate-500">
                      No migrations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-slate-500">
              Showing {page * ITEMS_PER_PAGE + 1}-{Math.min((page + 1) * ITEMS_PER_PAGE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={i === page ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPage(i)}
                  className={cn(
                    "h-8 w-8 p-0 text-xs",
                    i === page && "bg-azure-500 hover:bg-azure-600 text-white"
                  )}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
