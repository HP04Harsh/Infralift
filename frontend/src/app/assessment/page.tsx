"use client";

import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantInputModule } from "@/components/assistant/AssistantInputModule";
import { 
  Shield, AlertTriangle, CheckCircle, 
  Clock, Activity, Target, Zap, FileText, History, Play, LayoutDashboard as LayoutDashboardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function AssessmentAgentPage() {
  const router = useRouter();

  const quickActions = [
    {
      label: "Run Security Assessment",
      prompt: "Run a comprehensive security assessment on all Azure resources to identify vulnerabilities and misconfigurations.",
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    },
    {
      label: "Performance Analysis",
      prompt: "Analyze performance metrics across all resources to identify bottlenecks and optimization opportunities.",
      icon: <Zap className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Compliance Check",
      prompt: "Check compliance against Azure CIS Benchmark and identify policy violations.",
      icon: <FileText className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Cost Assessment",
      prompt: "Analyze resource costs across subscriptions and identify cost optimization opportunities.",
      icon: <Target className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Infrastructure Health",
      prompt: "Assess overall infrastructure health and identify resources requiring attention or maintenance.",
      icon: <Activity className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
    },
    {
      label: "Resource Inventory",
      prompt: "Generate a comprehensive inventory of all Azure resources with their configurations and dependencies.",
      icon: <CheckCircle className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Risk Assessment",
      prompt: "Identify and assess potential risks in the infrastructure including security, compliance, and operational risks.",
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      iconBg: "bg-orange-50 dark:bg-orange-900/30",
    },
  ];

  const placeholderVariants = [
    "Run a security posture assessment for production workloads...",
    "Analyze resource compliance risks across subscriptions...",
    "Generate infrastructure health assessment report...",
  ];

  const assessmentTypes = [
    {
      title: "Security Assessment",
      description: "Identify vulnerabilities and misconfigurations",
      icon: <Shield className="h-5 w-5 text-emerald-600" />,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      status: "Ready to run",
    },
    {
      title: "Performance Analysis",
      description: "Analyze resource performance metrics",
      icon: <Zap className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      status: "Ready to run",
    },
    {
      title: "Cost Assessment",
      description: "Identify cost optimization opportunities",
      icon: <Target className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      status: "Ready to run",
    },
    {
      title: "Compliance Check",
      description: "Validate against industry standards",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      status: "Ready to run",
    },
  ];

  const recentAssessments = [
    { name: "Security Scan - Production", type: "Security", status: "completed", findings: 12, time: "2 hours ago" },
    { name: "Performance Analysis - All Resources", type: "Performance", status: "completed", findings: 8, time: "1 day ago" },
    { name: "Compliance Check - CIS Benchmark", type: "Compliance", status: "in-progress", findings: 0, time: "3 hours ago" },
  ];

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
                    Assessment Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Analyze and assess your Azure infrastructure for security, performance, and compliance.
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
                  <Button variant="outline" size="sm" className="h-8">
                    <History className="h-4 w-4 mr-2" />
                    Assessment History
                  </Button>
                  <Button size="sm" className="h-8 bg-azure-500 hover:bg-azure-600">
                    <Play className="h-4 w-4 mr-2" />
                    New Assessment
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant Section */}
            <AssistantInputModule
              title="Assessment Assist"
              icon={<Activity className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              className="mb-6"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Assessment Types Grid */}
              <div className="lg:col-span-3">
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Assessment Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {assessmentTypes.map((type, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", type.iconBg)}>
                            {type.icon}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {type.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                            {type.description}
                          </p>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {type.status}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Assessments Table */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Recent Assessments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[200px]">Assessment Name</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[120px]">Type</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[100px]">Status</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[80px]">Findings</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[120px]">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentAssessments.map((assessment, index) => (
                            <tr key={index} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{assessment.name}</td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{assessment.type}</td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                  assessment.status === "completed" 
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                )}>
                                  {assessment.status === "completed" ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <Activity className="h-3 w-3 animate-pulse" />
                                  )}
                                  {assessment.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{assessment.findings}</td>
                              <td className="py-3 px-4 text-sm text-gray-500 dark:text-slate-400">{assessment.time}</td>
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
                {/* Quick Runs */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Quick Runs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        <Shield className="h-4 w-4 mr-2 text-emerald-500" />
                        Security Scan
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        <Zap className="h-4 w-4 mr-2 text-amber-500" />
                        Performance Check
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start h-8">
                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                        Compliance Audit
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Findings Raised */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Findings Raised
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Critical</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">High</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">8</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Medium</span>
                        <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">15</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Low</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">24</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Scan Duration */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Scan Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">2h 34m</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Last assessment duration
                      </p>
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