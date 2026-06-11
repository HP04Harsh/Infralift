"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Cloud, Server, Database, Container, Globe, Network,
  History, Plus, ArrowRight, Clock, CheckCircle, XCircle,
  Activity, Layers, LayoutDashboard as LayoutDashboardIcon,
  FileText, ExternalLink, ChevronRight, Bot, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { apiService } from "@/services/api";

interface ActiveResource {
  deployment_id: string;
  resource_type: string;
  resource_name: string;
  resource_group: string;
  region: string;
  created_at: string;
  status: string;
}

export default function ProvisioningAgentPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ completed: 0, in_progress: 0, failed: 0 });
  const [activeResources, setActiveResources] = useState<ActiveResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, resourcesRes] = await Promise.all([
          apiService.getProvisioningStats(),
          apiService.listProvisioningResources(10),
        ]);
        setStats({
          completed: (statsRes as any)?.completed ?? 0,
          in_progress: (statsRes as any)?.in_progress ?? 0,
          failed: (statsRes as any)?.failed ?? 0,
        });
        const list = (resourcesRes as any) || [];
        setActiveResources(Array.isArray(list) ? list : []);
      } catch (err: any) {
        setError(err?.message || "Failed to load provisioning data");
        setActiveResources([]);
      }
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const getTypeIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("virtualmachine") || t.includes("vm")) return <Server className="h-3.5 w-3.5" />;
    if (t.includes("storage")) return <Database className="h-3.5 w-3.5" />;
    if (t.includes("aks") || t.includes("container")) return <Container className="h-3.5 w-3.5" />;
    if (t.includes("app") || t.includes("web")) return <Cloud className="h-3.5 w-3.5" />;
    if (t.includes("network") || t.includes("vnet")) return <Network className="h-3.5 w-3.5" />;
    return <Layers className="h-3.5 w-3.5" />;
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
        <Sidebar />
        <div className="flex-1 lg:ml-[240px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-azure-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />

      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator />

        <main className="p-4 lg:p-5">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Cloud Infrastructure Engineer
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Deploy and manage Azure infrastructure with Azure SDK &amp; Terraform.
                    <span className="ml-2 text-xs text-gray-400">Just describe what you need.</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push('/provisioning/history')} className="h-8">
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                  <Button size="sm" onClick={() => router.push('/provisioning/chat')} className="h-8 bg-azure-500 hover:bg-azure-600">
                    <Bot className="h-4 w-4 mr-2" />
                    AI Deploy
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-800/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-azure-200/50 dark:border-azure-800/30 bg-gradient-to-br from-azure-50 to-white dark:from-azure-950/20 dark:to-slate-800/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-azure-100 dark:bg-azure-900/30 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-azure-600 dark:text-azure-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.in_progress}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">In Progress</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200/50 dark:border-red-800/30 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-800/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failed}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Failed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                {error}
              </div>
            )}

            {/* Main Content */}
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
                {/* Active Resources */}
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Active Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeResources.length > 0 ? (
                      <div className="space-y-2 max-h-[360px] overflow-y-auto">
                        {activeResources.map((r, i) => (
                          <div key={r.deployment_id || i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex-shrink-0 mt-0.5 text-gray-500 dark:text-slate-400">
                              {getTypeIcon(r.resource_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {r.resource_name}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                                {r.resource_group} &middot; {r.region || ""}
                              </p>
                            </div>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                              r.status === "Succeeded" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                              r.status === "Failed" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                              "bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-400"
                            )}>
                              {r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <FileText className="h-6 w-6 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 dark:text-slate-500">No active resources</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1">Resources appear here after deployment</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Deploy */}
                <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Quick Deploy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        className="w-full justify-start text-xs h-9"
                        variant="outline"
                        onClick={() => router.push('/provisioning/chat?prompt=' + encodeURIComponent("Create a Resource Group in Central India for production workloads"))}
                      >
                        <Layers className="h-3.5 w-3.5 mr-2" />
                        New Resource Group
                      </Button>
                      <Button
                        size="sm"
                        className="w-full justify-start text-xs h-9"
                        variant="outline"
                        onClick={() => router.push('/provisioning/chat?prompt=' + encodeURIComponent("Create a Virtual Machine in Central India with Ubuntu 24.04, Standard D2s v3"))}
                      >
                        <Server className="h-3.5 w-3.5 mr-2" />
                        New Virtual Machine
                      </Button>
                      <Button
                        size="sm"
                        className="w-full justify-start text-xs h-9"
                        variant="outline"
                        onClick={() => router.push('/provisioning/chat?prompt=' + encodeURIComponent("Create a Storage Account in Central India with Standard GRS"))}
                      >
                        <Database className="h-3.5 w-3.5 mr-2" />
                        New Storage Account
                      </Button>
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
