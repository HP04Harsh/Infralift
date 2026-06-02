"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  ExternalLink,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";

interface ViolationData {
  id: number;
  policy: string;
  resource: string;
  severity: string;
  status: string;
  location: string;
  description: string;
  impact: string;
  costImpact: string;
  steps: string[];
}

const violations: ViolationData[] = [
  {
    id: 1,
    policy: "Storage Account Encryption Disabled",
    resource: "prod-storage-001",
    severity: "High",
    status: "Open",
    location: "East US / prod-rg",
    description:
      "The storage account prod-storage-001 does not have Azure Storage Service Encryption (SSE) enabled for data at rest. All data written to this account is stored without encryption, exposing sensitive customer data and application logs to potential unauthorized access if the physical media is compromised.",
    impact:
      "Without encryption at rest, the organization risks data exposure during a physical breach or media disposal. Regulatory frameworks including HIPAA, PCI-DSS, and GDPR mandate encryption of data at rest. Non-compliance could result in fines up to 4% of annual revenue. Additionally, any existing or future certification audits will flag this as a critical finding, potentially delaying certification timelines.",
    costImpact:
      "Enabling SSE incurs no additional cost as Azure provides this feature free of charge. However, the risk of a data breach is estimated at $4.45M per incident (IBM Cost of Data Breach 2024). Remediation cost: $0. Opportunity cost of inaction: potential regulatory fines of $50K\u2013$500K per violation depending on jurisdiction.",
    steps: [
      "Navigate to the Azure Portal and select the storage account prod-storage-001",
      "Go to Settings > Configuration and enable 'Azure Storage Service Encryption'",
      "Select the encryption type (Microsoft-managed keys recommended) and save the changes",
      "Verify the encryption status by checking the 'Encryption' blade shows 'Enabled' and run a test upload to confirm",
    ],
  },
  {
    id: 2,
    policy: "SQL Database Auditing Disabled",
    resource: "sql-cluster-01",
    severity: "Medium",
    status: "In Progress",
    location: "West Europe / sql-rg",
    description:
      "The Azure SQL Database instance sql-cluster-01 has auditing disabled. Database auditing tracks all database events and writes them to an audit log in your Azure Storage account. Without auditing, the organization cannot detect anomalous access patterns, unauthorized schema changes, or data exfiltration attempts in a timely manner.",
    impact:
      "Absence of database auditing severely limits the security team's ability to perform forensic analysis after a security incident. Mean time to detect (MTTD) increases significantly, as manual log investigation is required. Compliance frameworks like SOC 2, PCI-DSS (requirement 10), and HIPAA ($164.312(b)) require audit controls. Continued non-compliance threatens the existing SOC 2 Type II certification.",
    costImpact:
      "Azure SQL Auditing costs approximately $0.025/GB for audit log storage. For this workload, estimated monthly cost: $5\u2013$15. The cost of a single security incident going undetected for an extended period is estimated at $200K\u2013$2M. Remediation cost: ~$15/month. A 30-day audit log retention window is recommended at minimal cost.",
    steps: [
      "Open the SQL database sql-cluster-01 in the Azure Portal and go to the 'Auditing' blade",
      "Toggle 'Enable Azure SQL Auditing' to On and select a storage account for audit logs",
      "Configure the retention period (minimum 90 days recommended for compliance) and define the events to log",
      "Save the configuration and verify by querying the sys.dm_audit_actions view for active audit trails",
    ],
  },
  {
    id: 3,
    policy: "VM Network Security Group Misconfigured",
    resource: "web-server-002",
    severity: "High",
    status: "Open",
    location: "Southeast Asia / web-rg",
    description:
      "The Network Security Group (NSG) attached to web-server-002 contains an overly permissive inbound rule allowing RDP (port 3389) access from the Internet (0.0.0.0/0). This configuration exposes the virtual machine to brute-force attacks, credential theft, and potential remote exploitation by threat actors scanning for open RDP ports.",
    impact:
      "Open RDP to the internet is one of the most common attack vectors observed in cloud environments. Automated scanning tools can detect this within hours. If compromised, the VM can be used as a pivot point to access other resources in the virtual network. This violation also violates the Azure Security Benchmark (NS-1) and CIS Control 4.1.",
    costImpact:
      "Fixing this requires zero infrastructure cost\u2014only configuration changes. The potential cost of a VM compromise includes data exfiltration, lateral movement cleanup, and downtime. Average cost of a ransomware attack originating from exposed RDP: $1.85M. Justified Azure Bastion Host cost: ~$150/month as a secure alternative.",
    steps: [
      "In the Azure Portal, navigate to the NSG attached to web-server-002's subnet or NIC",
      "Locate the inbound rule allowing port 3389 from Any/Internet and edit it",
      "Change the Source to 'IP Addresses' and specify your authorized public IP or set up Azure Bastion for JIT access",
      "Test connectivity via the authorized method only, then monitor NSG flow logs for any denied RDP attempts",
    ],
  },
  {
    id: 4,
    policy: "Key Vault Soft Delete Disabled",
    resource: "keyvault-prod",
    severity: "Medium",
    status: "Resolved",
    location: "East US 2 / security-rg",
    description:
      "The Key Vault instance keyvault-prod previously had soft-delete and purge protection disabled. Soft-delete allows recovery of deleted secrets, keys, and certificates for a configurable retention period. Without it, any accidental or malicious deletion results in permanent loss of cryptographic material, causing service outages and data encryption lockouts.",
    impact:
      "Loss of key material can result in permanent data inaccessibility for Azure Disk Encryption, SQL TDE, and any customer-managed encryption scenarios. Recovery time from a key deletion incident without soft-delete: impossible. With soft-delete: minutes. The Azure Security Benchmark (DP-6) and CIS 8.1 require soft-delete to be enabled for all Key Vaults.",
    costImpact:
      "Enabling soft-delete and purge protection is free. The cost of a key deletion incident includes service restoration, potential data recovery consultants, and business downtime. Estimated downtime cost per hour for critical production services: $10K\u2013$100K. Remediation cost: $0. This violation has already been resolved as a proactive measure.",
    steps: [
      "In Azure Portal, go to keyvault-prod and open the 'Properties' blade",
      "Enable 'Soft-delete' (set retention period to 90 days per best practice)",
      "Enable 'Purge protection' to prevent permanent deletion before the retention period ends",
      "Verify the configuration by attempting to delete and recover a test secret through Azure CLI or Portal",
    ],
  },
];

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
  const violation = violations.find((v) => v.id === Number(id));

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

  const FixNowUrl = `/compliance/chat?prompt=I+want+to+fix+${encodeURIComponent(violation.policy)}+on+${encodeURIComponent(violation.resource)}+located+in+${encodeURIComponent(violation.location)}.+${encodeURIComponent(violation.description)}`;

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
              <p className="text-xs text-gray-500 dark:text-slate-400">Location</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {violation.location}
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
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
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
                  Future Impact Assessment
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
