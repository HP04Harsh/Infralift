"use client";

import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantInputModule } from "@/components/assistant/AssistantInputModule";
import { 
  Shield, AlertTriangle, CheckCircle, Clock, 
  FileText, Scale, Lock, Globe, Activity, Search, LayoutDashboard as LayoutDashboardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ComplianceAgentPage() {
  const router = useRouter();

  const quickActions = [
    {
      label: "Run Compliance Scan",
      prompt: "Run a comprehensive compliance scan against Azure CIS Benchmark and identify any policy violations.",
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    },
    {
      label: "Check Policy Violations",
      prompt: "Check for policy violations across all resources and provide remediation steps.",
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Generate Compliance Report",
      prompt: "Generate a detailed compliance report for [Framework] with audit findings and recommendations.",
      icon: <FileText className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Security Audit",
      prompt: "Conduct a security audit of [Resource Type] and identify security gaps or misconfigurations.",
      icon: <Lock className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Framework Assessment",
      prompt: "Assess compliance against [Compliance Framework] and provide gap analysis.",
      icon: <Scale className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Remediation Plan",
      prompt: "Generate a remediation plan for identified compliance violations with prioritized actions.",
      icon: <Activity className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
    },
    {
      label: "Data Classification",
      prompt: "Classify data across all resources based on sensitivity and apply appropriate security controls.",
      icon: <Globe className="h-4 w-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
    },
  ];

  const placeholderVariants = [
    "Scan infrastructure for HIPAA violations...",
    "Generate SOC2 readiness report...",
    "Audit policy violations across subscriptions...",
  ];

  const complianceFrameworks = [
    {
      title: "Azure CIS Benchmark",
      description: "Center for Internet Security Azure benchmark",
      icon: <Shield className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      compliance: "92%",
    },
    {
      title: "HIPAA",
      description: "Health Insurance Portability and Accountability Act",
      icon: <Lock className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      compliance: "88%",
    },
    {
      title: "PCI-DSS",
      description: "Payment Card Industry Data Security Standard",
      icon: <Scale className="h-5 w-5 text-green-600" />,
      iconBg: "bg-green-100 dark:bg-green-900/40",
      compliance: "95%",
    },
    {
      title: "GDPR",
      description: "General Data Protection Regulation",
      icon: <Globe className="h-5 w-5 text-cyan-600" />,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
      compliance: "90%",
    },
    {
      title: "SOC 2",
      description: "Service Organization Control 2",
      icon: <FileText className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      compliance: "87%",
    },
    {
      title: "NIST 800-53",
      description: "NIST Security and Privacy Controls",
      icon: <Activity className="h-5 w-5 text-indigo-600" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
      compliance: "91%",
    },
  ];

  const policyViolations = [
    { id: 1, policy: "Storage account encryption", resource: "prod-storage-001", severity: "High", status: "Open", action: "Enable encryption" },
    { id: 2, policy: "SQL database auditing", resource: "sql-cluster-01", severity: "Medium", status: "In Progress", action: "Enable auditing" },
    { id: 3, policy: "VM network security group", resource: "web-server-002", severity: "High", status: "Open", action: "Update NSG rules" },
    { id: 4, policy: "Key vault soft delete", resource: "keyvault-prod", severity: "Medium", status: "Resolved", action: "Enable soft delete" },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "High":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "Medium":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "Low":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "In Progress":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "Open":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator userName="Harsh Pardhi" />
        
        <main className="p-4 lg:p-5">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Policy & Compliance Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Ensure compliance with industry standards and regulations.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/dashboard')}
                    className="h-8 text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 hover:bg-azure-50 dark:hover:bg-azure-900/20"
                  >
                    <LayoutDashboardIcon className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant Section */}
            <AssistantInputModule
              title="Compliance Assist"
              icon={<Shield className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              className="mb-6"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Compliance Frameworks */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Compliance Frameworks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {complianceFrameworks.map((framework, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", framework.iconBg)}>
                            {framework.icon}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {framework.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                            {framework.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-slate-400">Compliance</span>
                            <span className={cn(
                              "text-sm font-semibold",
                              parseInt(framework.compliance) >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                              parseInt(framework.compliance) >= 80 ? "text-amber-600 dark:text-amber-400" :
                              "text-red-600 dark:text-red-400"
                            )}>
                              {framework.compliance}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Policy Violations */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Policy Violations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[180px]">Policy</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[140px]">Resource</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[80px]">Severity</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[100px]">Status</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[120px]">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {policyViolations.map((violation) => (
                            <tr key={violation.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{violation.policy}</td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{violation.resource}</td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                                  getSeverityColor(violation.severity)
                                )}>
                                  {violation.severity}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-medium",
                                  getStatusColor(violation.status)
                                )}>
                                  {violation.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  {violation.action}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar Widgets */}
              <div className="space-y-4">
                {/* Overall Compliance */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Overall Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">91%</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Average across all frameworks
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Violation Summary */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Violation Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Critical</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">2</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">High</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">5</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Medium</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">12</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Low</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">8</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Audits */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recent Audits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            CIS Benchmark Scan
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">2 days ago</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            HIPAA Compliance Check
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">5 days ago</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            PCI-DSS Assessment
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">In progress</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}