"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientChatInput } from "@/components/assistant/AnimatedGradientChatInput";
import {
  Cloud, Server, Database, Container, Globe, Network,
  History, Plus, ArrowRight, Clock, CheckCircle, XCircle,
  Activity, Layers, LayoutDashboard as LayoutDashboardIcon,
  FileText, ExternalLink, ChevronRight, Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTenantDataStore } from "@/store/tenantDataStore";
import { useDeploymentStore } from "@/store/deploymentStore";
import { apiService } from "@/services/api";

interface ResourceState {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceGroup: string;
  deploymentId: string;
  region?: string;
  terraformLocation?: string;
  createdAt: string;
  subscriptionId?: string;
  tags?: Record<string, string>;
}

export default function ProvisioningAgentPage() {
  const router = useRouter();
  const { stats, loading, fetchAll } = useTenantDataStore();
  const [inputValue, setInputValue] = useState("");
  const deployments = useDeploymentStore((s) => s.deployments);
  const setDeployments = useDeploymentStore((s) => s.setDeployments);
  const [resourceStates, setResourceStates] = useState<ResourceState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);

  useEffect(() => {
    if (loading) fetchAll();
  }, [loading, fetchAll]);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res: any = await apiService.listResourceStates();
        const list = (res?.resources || []) as ResourceState[];
        setResourceStates(list);
      } catch {
        setResourceStates([]);
      }
      setStatesLoading(false);
    };
    fetchState();
  }, []);

  useEffect(() => {
    const pollDeployments = async () => {
      try {
        const response = (await apiService.getDeployments()) as { resources?: Record<string, unknown>[] };
        const mapped = (response.resources || []).map((r: Record<string, unknown>) => ({
          id: (r.resourceId as string) || (r.id as string) || '',
          name: (r.resourceName as string) || (r.name as string) || '',
          type: (r.resourceType as string) || (r.type as string) || '',
          status: ((r.status as string) || 'completed') as any,
          dateTime: r.createdAt
            ? new Date(r.createdAt as string).toLocaleString()
            : new Date().toLocaleString(),
          initiatedBy: (r.initiatedBy as string) || (r.userId as string) || 'System',
          agentType: 'provisioning',
        }));
        setDeployments(mapped);
      } catch {
        // keep existing store data
      }
    };
    pollDeployments();
    const interval = setInterval(pollDeployments, 15000);
    return () => clearInterval(interval);
  }, [setDeployments]);

  const recentDeployments = useMemo(() => deployments.slice(0, 5), [deployments]);
  const completedCount = useMemo(() => deployments.filter(d => d.status === 'completed').length, [deployments]);
  const inProgressCount = useMemo(() => deployments.filter(d => d.status === 'in-progress').length, [deployments]);
  const failedCount = useMemo(() => deployments.filter(d => d.status === 'failed').length, [deployments]);

  const trackedResources = useMemo(() => resourceStates.slice(0, 5), [resourceStates]);

  const getTypeIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("virtualmachine") || t.includes("vm")) return <Server className="h-3.5 w-3.5" />;
    if (t.includes("storage")) return <Database className="h-3.5 w-3.5" />;
    if (t.includes("aks") || t.includes("container")) return <Container className="h-3.5 w-3.5" />;
    if (t.includes("app") || t.includes("web")) return <Cloud className="h-3.5 w-3.5" />;
    if (t.includes("network")) return <Network className="h-3.5 w-3.5" />;
    return <Layers className="h-3.5 w-3.5" />;
  };

  const quickActions = [
    {
      label: "Deploy Resource Group",
      prompt: "I want to create a Resource Group for production workloads with proper tagging.",
      icon: <Layers className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Deploy Virtual Machine",
      prompt: "I want to deploy a Virtual Machine with Ubuntu 24.04, Standard D2s v3, and monitoring enabled.",
      icon: <Server className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Deploy Storage Account",
      prompt: "I want to create a Storage Account with Standard GRS redundancy and StorageV2 kind.",
      icon: <Database className="h-4 w-4 text-green-500" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      label: "Deploy AKS Cluster",
      prompt: "I want to deploy an AKS cluster with 3 nodes and Standard D2s v3 VM size.",
      icon: <Container className="h-4 w-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
    },
    {
      label: "Configure Networking",
      prompt: "I want to configure networking with a virtual network (10.0.0.0/16), subnets, and NSG.",
      icon: <Network className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Deploy App Service",
      prompt: "I want to deploy an App Service with Node.js 20 runtime and Standard S1 plan.",
      icon: <Cloud className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Deploy Database",
      prompt: "I want to deploy a database with Standard S2 tier and 50GB storage.",
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
      prompt: "Create a Resource Group in Central India for production workloads with proper tagging.",
    },
    {
      title: "Virtual Machine",
      description: "Deploy scalable compute resources",
      icon: <Server className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      prompt: "Create a Virtual Machine in Central India with Ubuntu 24.04, Standard D2s v3 size, backup enabled, and full monitoring.",
    },
    {
      title: "Storage Account",
      description: "Cloud storage for data objects",
      icon: <Database className="h-5 w-5 text-green-600" />,
      iconBg: "bg-green-100 dark:bg-green-900/40",
      prompt: "Create a Storage Account in Central India with Standard GRS redundancy and StorageV2 kind.",
    },
    {
      title: "AKS Cluster",
      description: "Managed Kubernetes service",
      icon: <Container className="h-5 w-5 text-indigo-600" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
      prompt: "Deploy an AKS cluster in Central India with 3 nodes, Standard D2s v3 VM size, and Container Insights monitoring.",
    },
    {
      title: "App Service",
      description: "Host web applications and APIs",
      icon: <Cloud className="h-5 w-5 text-cyan-600" />,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
      prompt: "Deploy an App Service in Central India with Node.js 20 runtime and Standard S1 plan.",
    },
    {
      title: "Networking",
      description: "VNet, subnets, and security rules",
      icon: <Network className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      prompt: "Configure networking with VNet (10.0.0.0/16), 3 subnets, and network security groups.",
    },
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
                    AI Infrastructure Engineer. Deploy and manage Azure infrastructure with Azure SDK &amp; Terraform.
                    <span className="ml-2 text-xs text-gray-400">No Azure knowledge required — just describe what you need.</span>
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
                    Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/provisioning/history')}
                    className="h-8"
                  >
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push('/provisioning/chat')}
                    className="h-8 bg-azure-500 hover:bg-azure-600"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    AI Deploy
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant */}
            <AnimatedGradientChatInput
              title="Provisioning Assist"
              icon={<Activity className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              agentType="provisioning"
              className="mb-6"
              value={inputValue}
              onValueChange={setInputValue}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Templates Grid */}
              <div className="lg:col-span-3">
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
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
                          onClick={() => router.push(`/provisioning/chat?prompt=${encodeURIComponent(template.prompt)}`)}
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
                            Deploy <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Deployment Status */}
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Deployment Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Completed</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{completedCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">In Progress</span>
                        <span className="text-sm font-semibold text-azure-600 dark:text-azure-400">{inProgressCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Failed</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">{failedCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tracked Resources */}
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Tracked Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Activity className="h-4 w-4 text-gray-400 animate-spin" />
                      </div>
                    ) : trackedResources.length > 0 ? (
                      <div className="space-y-2 max-h-[240px] overflow-y-auto">
                        {trackedResources.map((r, i) => (
                          <div key={r.resourceId || i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex-shrink-0 mt-0.5 text-gray-500 dark:text-slate-400">
                              {getTypeIcon(r.resourceType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {r.resourceName}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                                {r.resourceGroup} &middot; {r.region || ""}
                              </p>
                              {r.terraformLocation && (
                                <p className="text-[10px] text-cyan-500 dark:text-cyan-400 truncate font-mono">
                                  TF: {r.terraformLocation}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 flex-shrink-0">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <FileText className="h-6 w-6 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 dark:text-slate-500">No tracked resources</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1">Resources appear here after deployment</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Active Resources */}
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Active Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total_resources ?? 0}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Total deployed resources
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Deployments */}
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recent Deployments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentDeployments.length > 0 ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {recentDeployments.map((dep) => (
                          <div key={dep.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex-shrink-0 mt-0.5">
                              {dep.status === "completed" ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              ) : dep.status === "failed" ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <Activity className="h-4 w-4 text-azure-500 animate-pulse" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{dep.name}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">{dep.type}</p>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">{dep.dateTime}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No recent deployments</p>
                    )}
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
