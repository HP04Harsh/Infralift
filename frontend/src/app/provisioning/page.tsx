"use client";

import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantInputModule } from "@/components/assistant/AssistantInputModule";
import { 
  Cloud, Server, Database, Container, Globe, Network, 
  History, Plus, ArrowRight, Clock, CheckCircle, 
  Activity, Layers, LayoutDashboard as LayoutDashboardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ProvisioningAgentPage() {
  const router = useRouter();

  const quickActions = [
    {
      label: "Deploy Resource Group",
      prompt: "I want to create a Resource Group in [Region Name] for [Environment Type] workloads with proper tagging and monitoring enabled.",
      icon: <Layers className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Deploy Virtual Machine",
      prompt: "I want to deploy a Virtual Machine in [Region Name] with [OS Type], [VM Size], and monitoring enabled.",
      icon: <Server className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Deploy Storage Account",
      prompt: "I want to create a Storage Account in [Region Name] with [Storage Type] and [Redundancy Level].",
      icon: <Database className="h-4 w-4 text-green-500" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      label: "Deploy AKS Cluster",
      prompt: "I want to deploy an AKS cluster in [Region Name] with [Node Count] and [VM Size] with monitoring enabled.",
      icon: <Container className="h-4 w-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
    },
    {
      label: "Configure Networking",
      prompt: "I want to configure networking for [Resource Type] with [VNet Configuration] and security rules.",
      icon: <Network className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Deploy App Service",
      prompt: "I want to deploy an App Service in [Region Name] with [Runtime Stack] and [App Service Plan] for hosting web applications.",
      icon: <Cloud className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Deploy Database",
      prompt: "I want to deploy a [Database Type] in [Region Name] with [Tier] and [Storage Capacity] for application data.",
      icon: <Database className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
    },
  ];

  const placeholderVariants = [
    "Deploy a production-ready AKS cluster with monitoring enabled...",
    "Create a secure virtual machine in Central India...",
    "Configure a scalable App Service environment...",
  ];

  const deploymentTemplates = [
    {
      title: "Resource Group",
      description: "Organize and manage Azure resources",
      icon: <Layers className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
    },
    {
      title: "Virtual Machine",
      description: "Deploy scalable compute resources",
      icon: <Server className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
    },
    {
      title: "Storage Account",
      description: "Cloud storage for data objects",
      icon: <Database className="h-5 w-5 text-green-600" />,
      iconBg: "bg-green-100 dark:bg-green-900/40",
    },
    {
      title: "AKS Cluster",
      description: "Managed Kubernetes service",
      icon: <Container className="h-5 w-5 text-indigo-600" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    },
    {
      title: "App Service",
      description: "Host web applications and APIs",
      icon: <Cloud className="h-5 w-5 text-cyan-600" />,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
    },
    {
      title: "Networking",
      description: "VNet, subnets, and security rules",
      icon: <Network className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
    },
  ];

  const recentDeployments = [
    { name: "prod-web-vm-001", type: "Virtual Machine", status: "completed", time: "2 min ago" },
    { name: "dev-storage-acc", type: "Storage Account", status: "completed", time: "15 min ago" },
    { name: "staging-aks-cluster", type: "AKS Cluster", status: "in-progress", time: "1 hour ago" },
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
                    Provisioning Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Deploy and manage Azure infrastructure resources intelligently.
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
                    Deployment History
                  </Button>
                  <Button size="sm" className="h-8 bg-azure-500 hover:bg-azure-600">
                    <Plus className="h-4 w-4 mr-2" />
                    New Deployment
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant Section */}
            <AssistantInputModule
              title="Provisioning Assist"
              icon={<Activity className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              className="mb-6"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Deployment Templates Grid */}
              <div className="lg:col-span-3">
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 backdrop-blur-sm shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Deployment Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {deploymentTemplates.map((template, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0, 0, 0, 0.12)" }}
                          className="border border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300/50 dark:hover:border-azure-700/50 hover:shadow-lg"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", template.iconBg)}>
                            {template.icon}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {template.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                            {template.description}
                          </p>
                          <Button variant="ghost" size="sm" className="h-7 px-0 text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 p-0">
                            Deploy <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar Widgets */}
              <div className="space-y-4">
                {/* Recent Deployments */}
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 backdrop-blur-sm shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recent Deployments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentDeployments.map((deployment, index) => (
                        <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex-shrink-0 mt-0.5">
                            {deployment.status === "completed" ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Activity className="h-4 w-4 text-azure-500 animate-pulse" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {deployment.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {deployment.type}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">
                            {deployment.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Deployment Status */}
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 backdrop-blur-sm shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Deployment Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Completed</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">24</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">In Progress</span>
                        <span className="text-sm font-semibold text-azure-600 dark:text-azure-400">3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Failed</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">1</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Resources */}
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 backdrop-blur-sm shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Active Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">156</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Total deployed resources
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