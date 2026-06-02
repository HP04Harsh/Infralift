"use client";

import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantInputModule } from "@/components/assistant/AssistantInputModule";
import { 
  DollarSign, TrendingDown, Server, Database, 
  Clock, Zap, Layers, Target, PiggyBank, ArrowUpRight, Wallet, LayoutDashboard as LayoutDashboardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function OptimizationAgentPage() {
  const router = useRouter();

  const quickActions = [
    {
      label: "Find Cost Savings",
      prompt: "Analyze my Azure resources and identify potential cost optimization opportunities across compute, storage, and networking.",
      icon: <PiggyBank className="h-4 w-4 text-green-500" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      label: "Rightsize VMs",
      prompt: "Identify virtual machines that can be rightsized based on actual usage patterns to reduce costs.",
      icon: <Server className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Optimize Storage",
      prompt: "Find storage optimization opportunities including unused resources, tier optimization, and cleanup.",
      icon: <Database className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Reserved Instances",
      prompt: "Analyze workload patterns and recommend reserved instance purchases for maximum cost savings.",
      icon: <Clock className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Cleanup Resources",
      prompt: "Identify and remove unused or orphaned resources that are incurring costs without providing value.",
      icon: <Layers className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
    },
    {
      label: "Network Optimization",
      prompt: "Optimize network costs by analyzing traffic patterns and recommending cost-effective routing options.",
      icon: <Target className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Budget Analysis",
      prompt: "Analyze current spending against budget and provide forecasting for upcoming billing periods.",
      icon: <Wallet className="h-4 w-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
    },
  ];

  const placeholderVariants = [
    "Find underutilized Azure resources...",
    "Generate cost optimization recommendations...",
    "Analyze reserved instance opportunities...",
  ];

  const optimizationCategories = [
    {
      title: "VM Rightsizing",
      description: "Optimize VM sizes based on usage",
      icon: <Server className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      savings: "$340/mo",
      prompt: "I want to optimize my virtual machine sizes based on actual usage patterns. Please analyze CPU, memory, and disk usage across all VMs, identify over-provisioned resources, recommend appropriate VM sizes for right-sizing, and provide estimated cost savings.",
    },
    {
      title: "Reserved Instances",
      description: "Save with reserved instances",
      icon: <Clock className="h-5 w-5 text-green-600" />,
      iconBg: "bg-green-100 dark:bg-green-900/40",
      savings: "$1,200/mo",
      prompt: "I want to optimize costs using Azure Reserved Instances. Please analyze my workload patterns, identify resources that would benefit from reserved instances, recommend the best reservation terms (1-year, 3-year), and calculate potential savings compared to pay-as-you-go pricing.",
    },
    {
      title: "Storage Optimization",
      description: "Optimize storage tiers and cleanup",
      icon: <Database className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      savings: "$180/mo",
      prompt: "I want to optimize my Azure storage costs. Please analyze storage usage across all storage accounts, identify opportunities for tier optimization (hot, cool, archive), find unused or stale data that can be deleted or archived, and provide recommendations for cost reduction.",
    },
    {
      title: "Idle Resources",
      description: "Identify and remove idle resources",
      icon: <Zap className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      savings: "$520/mo",
      prompt: "I want to identify and remove idle or unused Azure resources. Please analyze all resources for inactivity, identify orphaned resources (disks, NICs, IPs with no parent), find resources with zero usage over the past 30 days, and provide a cleanup plan with estimated cost savings.",
    },
    {
      title: "Database Optimization",
      description: "Optimize database configurations",
      icon: <Layers className="h-5 w-5 text-cyan-600" />,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
      savings: "$290/mo",
      prompt: "I want to optimize my Azure database costs and performance. Please analyze database configurations, identify over-provisioned compute and storage, recommend appropriate service tiers and performance levels, and provide optimization recommendations for both SQL and NoSQL databases.",
    },
    {
      title: "Spot Instances",
      description: "Use spot instances for workloads",
      icon: <Target className="h-5 w-5 text-indigo-600" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
      savings: "$450/mo",
      prompt: "I want to leverage Azure Spot Instances for cost savings. Please identify workloads suitable for spot instances (batch processing, dev/test, fault-tolerant apps), recommend implementation strategies, and provide guidance on handling spot instance evictions and ensuring high availability.",
    },
  ];

  const topRecommendations = [
    { id: 1, title: "Downsize prod-web-001 from D4s_v3 to D2s_v3", savings: "$120/mo", effort: "Low", status: "pending", prompt: "I want to implement the recommendation to downsize prod-web-001 from D4s_v3 to D2s_v3. Please analyze the current resource usage, verify that D2s_v3 can handle the workload, provide a safe resizing plan, and estimate the cost savings." },
    { id: 2, title: "Purchase reserved instances for database cluster", savings: "$800/mo", effort: "Medium", status: "pending", prompt: "I want to implement the recommendation to purchase reserved instances for the database cluster. Please analyze the workload patterns, determine the best reservation term (1-year or 3-year), calculate the total savings, and provide a step-by-step implementation plan." },
    { id: 3, title: "Delete unused storage account legacy-backup-01", savings: "$45/mo", effort: "Low", status: "pending", prompt: "I want to implement the recommendation to delete the unused storage account legacy-backup-01. Please verify that there are no active references to this storage account, check if there are any important files that need to be preserved, and provide a safe deletion plan." },
    { id: 4, title: "Migrate dev VMs to spot instances", savings: "$320/mo", effort: "Medium", status: "pending", prompt: "I want to implement the recommendation to migrate development VMs to spot instances. Please identify which VMs are suitable for spot instances, analyze the workload patterns, provide guidance on handling spot instance evictions, and create a migration plan with high availability considerations." },
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
                    Optimization Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Optimize Azure infrastructure costs and performance.
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
              title="Optimization Assist"
              icon={<TrendingDown className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              agentType="optimization"
              className="mb-6"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Savings Summary */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                      Savings Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Potential Monthly Savings</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">$2,980</p>
                      </div>
                      <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Implemented Savings</p>
                        <p className="text-2xl font-bold text-azure-600 dark:text-azure-400">$1,450</p>
                      </div>
                      <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Optimization Score</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">78%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Optimization Categories */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Optimization Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {optimizationCategories.map((category, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                          onClick={() => router.push(`/optimization/chat?prompt=${encodeURIComponent(category.prompt)}`)}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", category.iconBg)}>
                            {category.icon}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {category.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                            {category.description}
                          </p>
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {category.savings}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Recommendations */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Top Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topRecommendations.map((rec) => (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-4 p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {rec.title}
                            </h4>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {rec.savings}
                              </span>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                rec.effort === "Low" 
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              )}>
                                {rec.effort} Effort
                              </span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => router.push(`/optimization/chat?prompt=${encodeURIComponent(rec.prompt)}`)}
                            className="h-8 flex-shrink-0"
                          >
                            Apply
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar Widgets */}
              <div className="space-y-4">
                {/* Savings Breakdown */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Savings Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Compute</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">$1,240</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Storage</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">$680</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Network</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">$320</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Database</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">$540</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Cost Trend */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Monthly Cost Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">This Month</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">$12,450</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Last Month</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">$13,890</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Change</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">-10.4%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Budget Status */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Budget Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-azure-600 dark:text-azure-400">83%</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        of monthly budget used
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                        $2,550 remaining
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