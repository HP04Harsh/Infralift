"use client";

import { useState, useMemo, useEffect } from "react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Shield, Zap, FileText, Target, Activity, AlertTriangle, Search,
  ArrowLeft, ChevronUp, ChevronDown, CheckCircle, XCircle, Clock, Download,
  LayoutDashboard, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssessmentStore, type Assessment } from "@/store/assessmentStore";
import { apiService } from "@/services/api";

const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  "Security": { icon: <Shield className="h-4 w-4" />, color: "text-emerald-500" },
  "Performance": { icon: <Zap className="h-4 w-4" />, color: "text-amber-500" },
  "Compliance": { icon: <FileText className="h-4 w-4" />, color: "text-blue-500" },
  "Cost": { icon: <Target className="h-4 w-4" />, color: "text-purple-500" },
  "Health": { icon: <Activity className="h-4 w-4" />, color: "text-rose-500" },
  "Inventory": { icon: <CheckCircle className="h-4 w-4" />, color: "text-cyan-500" },
  "Risk": { icon: <AlertTriangle className="h-4 w-4" />, color: "text-orange-500" },
};

const statusConfig = {
  "completed": { icon: CheckCircle, className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  "in-progress": { icon: Activity, className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  "failed": { icon: XCircle, className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
};

const defaultIcon = { icon: <Shield className="h-4 w-4" />, color: "text-gray-500" };

type SortKey = keyof Assessment;
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export default function AssessmentHistoryPage() {
  const router = useRouter();
  const storedAssessments = useAssessmentStore((s) => s.assessments);
  const setAssessments = useAssessmentStore((s) => s.setAssessments);
  const [assessments, setLocalAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dateTime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        setLoading(true);
        const response = (await apiService.getAssessments()) as { assessments?: Record<string, unknown>[] };
        const fetched = (response.assessments || []).map((a: Record<string, unknown>) => ({
          id: (a.id as string) || '',
          name: (a.name as string) || '',
          type: (a.type as string) || '',
          status: (a.status as 'completed' | 'in-progress' | 'failed') || 'completed',
          findings: (a.findings as number) || 0,
          dateTime: a.dateTime
            ? new Date(a.dateTime as string).toLocaleString()
            : new Date().toLocaleString(),
          initiatedBy: (a.initiatedBy as string) || (a.userId as string) || 'System',
          duration: (a.duration as number) || 0,
        }));
        setLocalAssessments(fetched);
        setAssessments(fetched);
      } catch {
        setLocalAssessments(storedAssessments);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessments();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assessments.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      a.status.toLowerCase().includes(q) ||
      a.initiatedBy.toLowerCase().includes(q)
    );
  }, [search, assessments]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal ?? "").localeCompare(String(bVal ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
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

  const handleExportCSV = () => {
    const headers = ["Assessment Name", "Type", "Status", "Findings", "Date/Time", "Initiated By", "Duration (s)"];
    const rows = sorted.map((a) => [a.name, a.type, a.status, String(a.findings), a.dateTime, a.initiatedBy, String(a.duration)]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goToObservability = (assessment: Assessment) => {
    router.push(`/observability?id=${encodeURIComponent(assessment.id)}`);
  };

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/assessment")}
              className="h-8 px-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assessment Agent</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Assessment History</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/assessment/chat")}
              className="h-8 bg-azure-500 hover:bg-azure-600"
            >
              New Assessment
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <Input
              placeholder="Search assessments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-slate-500">{loading ? 'Loading...' : `${sorted.length} assessments`}</span>
        </div>

        <div className="border border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <SortHeader column="name" label="Assessment Name" />
                  <SortHeader column="type" label="Type" />
                  <SortHeader column="status" label="Status" />
                  <SortHeader column="findings" label="Findings" />
                  <SortHeader column="duration" label="Duration" />
                  <SortHeader column="dateTime" label="Date/Time" />
                  <SortHeader column="initiatedBy" label="Initiated By" />
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Dashboard</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((assessment, index) => {
                  const typeInfo = typeIcons[assessment.type] || defaultIcon;
                  const statusInfo = statusConfig[assessment.status];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <motion.tr
                      key={assessment.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{assessment.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("flex-shrink-0", typeInfo.color)}>{typeInfo.icon}</span>
                          <span className="text-sm text-gray-600 dark:text-slate-300">{assessment.type}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", statusInfo.className)}>
                          <StatusIcon className={cn("h-3 w-3", assessment.status === "in-progress" && "animate-pulse")} />
                          {assessment.status === "in-progress" ? "In Progress" : assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "text-sm font-medium",
                          assessment.findings === 0 ? "text-gray-400 dark:text-slate-500" :
                          assessment.findings > 10 ? "text-red-600 dark:text-red-400" :
                          "text-amber-600 dark:text-amber-400"
                        )}>
                          {assessment.findings}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-slate-400 font-mono">
                        {formatDuration(assessment.duration)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          {assessment.dateTime}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{assessment.initiatedBy}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => goToObservability(assessment)}
                          className="h-7 px-2 text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 hover:bg-azure-50 dark:hover:bg-azure-900/20"
                          title="View in Observability"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-gray-400 dark:text-slate-500">
                      {assessments.length === 0 ? "No assessments yet. Run an assessment from the Assessment Agent." : "No assessments found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Page {currentPage} of {totalPages} ({sorted.length} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                  className={cn("h-8 w-8 p-0 text-xs", p === currentPage && "bg-azure-500 hover:bg-azure-600")}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
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
