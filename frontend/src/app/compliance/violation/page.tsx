"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTenantDataStore } from "@/store/tenantDataStore";
import {
  AlertTriangle,
  Shield,
  ArrowLeft,
  Wrench,
  Globe,
  Server,
  Activity,
  DollarSign,
  Target,
  FileWarning,
  ChevronRight,
  Clock,
  MapPin,
  Scale,
  Lock,
  CheckCircle,
} from "lucide-react";

interface ViolationData {
  id: string;
  policy: string;
  resource: string;
  resourceType: string;
  severity: string;
  status: string;
  location: string;
  description: string;
  impact: string;
  costImpact: string;
  steps: string[];
  category: string;
}

const severityColors: Record<string, string> = {
  Critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  High: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  Medium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  Low: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
};

const statusColors: Record<string, string> = {
  Resolved: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  "In Progress": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  Open: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
};

const severityIcons: Record<string, React.ReactNode> = {
  Critical: <FileWarning className="h-4 w-4 text-red-600 dark:text-red-400" />,
  High: <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />,
  Medium: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  Low: <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
};

function ViolationReport() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { security, advisor } = useTenantDataStore();

  const violation = useMemo((): ViolationData | null => {
    if (!id) return null;

    const fromAdvisor = (advisor?.recommendations ?? []).find((r: any, i: number) => `adv-${r.id || i}` === id);
    if (fromAdvisor) {
      const sev = (fromAdvisor.impact || "Medium").toLowerCase() === "high" ? "High"
        : (fromAdvisor.impact || "Medium").toLowerCase() === "medium" ? "Medium" : "Low";
      return {
        id: `adv-${fromAdvisor.id || 0}`,
        policy: fromAdvisor.problem || fromAdvisor.solution || "Advisor Recommendation",
        resource: fromAdvisor.resource || "Unknown Resource",
        resourceType: "Azure Resource",
        severity: sev,
        status: "Open",
        location: "Azure / Default Region",
        description: fromAdvisor.problem
          ? `${fromAdvisor.problem}\n\nCategory: ${fromAdvisor.category || "General"}. Impact: ${fromAdvisor.impact || "Unknown"}.`
          : "No detailed description available.",
        impact: `This ${sev.toLowerCase()}-severity violation affects your compliance posture. ${fromAdvisor.category ? `Category: ${fromAdvisor.category}. ` : ""}Recommended action: ${fromAdvisor.solution || "Review and remediate."}`,
        costImpact: "Remediation cost varies based on the specific changes required. Azure Policy remediation is typically free of charge. The cost of inaction includes potential compliance penalties and security risks.",
        steps: [
          "Review the recommendation details in Azure Advisor",
          "Assess the impact on affected resources",
          "Apply the recommended remediation through Azure Portal or CLI",
          "Verify compliance after remediation",
        ],
        category: fromAdvisor.category || "Advisor",
      };
    }

    const fromAlert = (security?.alerts ?? []).find((a: any, i: number) => `alert-${a.id || a.name || i}` === id);
    if (fromAlert) {
      const sevMap: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };
      const severity = sevMap[(fromAlert.severity || "").toLowerCase()] || "Medium";
      const resource = fromAlert.resource_identifiers?.[0]?.split("/").pop() || "unknown";
      return {
        id: `alert-${fromAlert.id || ""}`,
        policy: fromAlert.name || "Security Alert",
        resource,
        resourceType: "Azure Resource",
        severity,
        status: fromAlert.status === "Resolved" ? "Resolved" : "Open",
        location: fromAlert.resource_identifiers?.[0]?.split("/").slice(0, 3).join("/") || "Azure",
        description: fromAlert.description || fromAlert.name || "Security alert from Microsoft Defender for Cloud.",
        impact: `Microsoft Defender for Cloud has detected a ${severity.toLowerCase()}-severity security issue: ${fromAlert.name || "Alert"}. If not addressed, this could lead to data exposure or compliance violations.`,
        costImpact: "Security incidents can result in significant costs including data breach remediation, regulatory fines, and operational downtime. Average cost of a data breach: $4.45M (IBM 2024).",
        steps: [
          "Investigate the security alert in Microsoft Defender for Cloud",
          "Review affected resources and attack surface",
          "Apply recommended remediation actions",
          "Verify the alert is resolved after remediation",
        ],
        category: "Defender",
      };
    }

    return null;
  }, [id, advisor, security]);

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: i * 0.1, ease: "easeOut" },
    }),
  };

  if (!violation) {
    return (
      <AgentLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <FileWarning className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Violation Not Found
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-md">
              The policy violation with ID &quot;{id}&quot; could not be found. It may have been removed or the ID may be incorrect.
            </p>
            <Button onClick={() => router.push("/compliance")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Compliance
            </Button>
          </motion.div>
        </div>
      </AgentLayout>
    );
  }

  const FixNowUrl = `/compliance/chat?prompt=I+want+to+fix+${encodeURIComponent(violation.policy)}+on+${encodeURIComponent(violation.resource)}`;

  return (
    <AgentLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-blue-600 rounded-xl px-6 py-5 -mx-1"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/compliance")}
                className="flex items-center gap-1.5 text-blue-100 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="h-6 w-px bg-blue-500" />
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-100" />
                <h1 className="text-lg font-bold text-white">
                  Policy Violation Report
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-semibold",
                  severityColors[violation.severity] ??
                    "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-700"
                )}
              >
                {severityIcons[violation.severity]}
                {violation.severity}
              </span>
              <span
                className={cn(
                  "text-xs px-3 py-1 rounded-full font-semibold",
                  statusColors[violation.status] ??
                    "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400"
                )}
              >
                {violation.status}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Summary Bar */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={cardVariants}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 shadow-sm">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-slate-400">Policy</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {violation.policy}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 shadow-sm">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Server className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-slate-400">Resource</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {violation.resource}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 shadow-sm">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-slate-400">Category</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {violation.category || "General"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Issue Details Card */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={1}
          variants={cardVariants}
        >
          <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 pb-4">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-amber-500" />
                Issue Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {violation.description}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Impact & Cost Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={2}
            variants={cardVariants}
          >
            <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden h-full">
              <CardHeader className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 pb-4">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-500" />
                  Impact Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  {violation.impact}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={cardVariants}
          >
            <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden h-full">
              <CardHeader className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 pb-4">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Cost Impact Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  {violation.costImpact}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recommended Actions Card */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={4}
          variants={cardVariants}
        >
          <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 pb-4">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Recommended Action Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <ol className="space-y-4">
                {violation.steps.map((step, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.5 + index * 0.12 }}
                    className="flex items-start gap-3"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                        {step}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={5}
          variants={cardVariants}
          className="flex items-center gap-3 pt-2 pb-6"
        >
          <Button
            size="lg"
            className="bg-azure-500 hover:bg-azure-600 text-white shadow-md shadow-azure-500/20"
            onClick={() => router.push(FixNowUrl)}
          >
            <Wrench className="h-4 w-4 mr-2" />
            Fix Now
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push("/compliance")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Compliance
          </Button>
        </motion.div>
      </div>
    </AgentLayout>
  );
}

export default function ViolationPage() {
  return (
    <Suspense
      fallback={
        <AgentLayout>
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-gray-500 dark:text-slate-400">
              <Activity className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading violation report...</span>
            </div>
          </div>
        </AgentLayout>
      }
    >
      <ViolationReport />
    </Suspense>
  );
}
