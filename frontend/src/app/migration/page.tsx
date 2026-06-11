"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientChatInput } from "@/components/assistant/AnimatedGradientChatInput";
import { 
  ArrowRight, History, Plus, Database, 
  Server, Cloud, HardDrive, Globe, Container, Clock, Activity,
  CheckCircle, TrendingUp, LayoutDashboard as LayoutDashboardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTenantDataStore } from "@/store/tenantDataStore";
import { useMigrationStore } from "@/store/migrationStore";

export default function MigrationAgentPage() {
  const router = useRouter();
  const [chatInput, setChatInput] = useState("");
  const { stats, loading, fetchAll } = useTenantDataStore();
  const migrations = useMigrationStore((s) => s.migrations);
  const totalCompleted = useMigrationStore((s) => s.totalCompleted);
  const totalInProgress = useMigrationStore((s) => s.totalInProgress);
  const totalPlanned = useMigrationStore((s) => s.totalPlanned);

  useEffect(() => {
    if (loading) fetchAll();
  }, []);

  const recentMigrations = useMemo(() => migrations.slice(0, 10), [migrations]);

  const totalResourcesMigrated = useMemo(
    () => migrations.filter((m) => m.status === "completed").reduce((sum, m) => sum + m.resourcesMigrated, 0),
    [migrations]
  );

  const overallProgress = useMemo(() => {
    const total = migrations.length;
    if (total === 0) return 0;
    const completed = migrations.filter((m) => m.status === "completed").length;
    return Math.round((completed / total) * 100);
  }, [migrations]);

  useEffect(() => {
    if (loading) fetchAll();
  }, []);

  const quickActions = [
    {
      label: "Lift & Shift Migration",
      prompt: "I want to perform a lift and shift migration of [VM Name] from [Source Environment] to [Target Region].",
      icon: <Server className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Database Migration",
      prompt: "I want to migrate [Database Name] from [Source Database] to [Target Database] with minimal downtime.",
      icon: <Database className="h-4 w-4 text-green-500" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      label: "App Migration",
      prompt: "I want to migrate [Application Name] to Azure App Service with proper configuration.",
      icon: <Cloud className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Container Migration",
      prompt: "I want to migrate containerized applications to Azure Kubernetes Service with proper orchestration.",
      icon: <Container className="h-4 w-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
    },
    {
      label: "Storage Migration",
      prompt: "I want to migrate data from [Source Storage] to Azure Storage Account with proper redundancy.",
      icon: <HardDrive className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Network Migration",
      prompt: "I want to migrate network configuration including VNETs, subnets, and security rules to Azure.",
      icon: <Globe className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Hybrid Setup",
      prompt: "I want to set up hybrid connectivity between on-premises infrastructure and Azure using VPN/ExpressRoute.",
      icon: <Activity className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
    },
  ];

  const placeholderVariants = [
    "Plan migration for on-prem SQL workloads to Azure...",
    "Assess VM migration readiness...",
    "Create phased migration strategy for enterprise applications...",
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case "in-progress": return <Activity className="h-5 w-5 text-blue-600 animate-pulse" />;
      case "planned": return <Clock className="h-5 w-5 text-amber-600" />;
      default: return <Database className="h-5 w-5 text-gray-600" />;
    }
  };

  const statusIconBg = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 dark:bg-emerald-900/40";
      case "in-progress": return "bg-blue-100 dark:bg-blue-900/40";
      case "planned": return "bg-amber-100 dark:bg-amber-900/40";
      default: return "bg-gray-100 dark:bg-gray-900/40";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "in-progress": return "In Progress";
      case "planned": return "Planned";
      default: return status;
    }
  };

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
                    Migration Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Plan and execute seamless migrations to Azure infrastructure.
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push('/migration/history')}
                    className="h-8"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Migration History
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => router.push('/migration/chat')}
                    className="h-8 bg-azure-500 hover:bg-azure-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Migration
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant Section */}
            <AnimatedGradientChatInput
              title="Migration Assist"
              icon={<TrendingUp className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              agentType="migration"
              className="mb-6"
              value={chatInput}
              onValueChange={setChatInput}
            />

            {/* Scenario Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {[
                { label: "SQL Migration", icon: <Database className="h-5 w-5" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", prompt: "Help me migrate SQL Server workloads to Azure SQL Database with minimal downtime." },
                { label: "VM Migration", icon: <Server className="h-5 w-5" />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", prompt: "Help me migrate on-premises virtual machines to Azure Virtual Machines." },
                { label: "App Migration", icon: <Cloud className="h-5 w-5" />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30", prompt: "Help me migrate applications to Azure App Service with proper configuration." },
                { label: "Storage Migration", icon: <HardDrive className="h-5 w-5" />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30", prompt: "Help me migrate data from on-premises storage to Azure Storage Accounts." },
                { label: "Database Migration", icon: <Database className="h-5 w-5" />, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/30", prompt: "Help me migrate databases to Azure Database for PostgreSQL or MySQL." },
                { label: "Hybrid Setup", icon: <Globe className="h-5 w-5" />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/30", prompt: "Help me set up hybrid connectivity between on-premises and Azure using VPN Gateway." },
              ].map((scenario) => (
                <motion.div
                  key={scenario.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                  onClick={() => setChatInput(scenario.prompt)}
                  className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", scenario.bg)}>
                    <span className={scenario.color}>{scenario.icon}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{scenario.label}</h3>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Migration Scenarios Grid */}
              <div className="lg:col-span-3">
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Migration Scenarios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {migrations.length === 0 ? (
                      <div className="text-center py-12">
                        <Database className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Migration Activity</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                          Start a new migration project to begin tracking your Azure migration journey.
                        </p>
                        <Button size="sm" onClick={() => router.push('/migration/chat')} className="bg-azure-500 hover:bg-azure-600">
                          <Plus className="h-4 w-4 mr-2" />
                          New Migration
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {migrations.map((migration, index) => (
                          <motion.div
                            key={migration.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                            onClick={() => router.push('/migration/chat')}
                            className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                          >
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", statusIconBg(migration.status))}>
                              {statusIcon(migration.status)}
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
                              {migration.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{migration.type}</p>
                            <span className={cn(
                              "inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3",
                              migration.status === "completed" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                              migration.status === "in-progress" && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                              migration.status === "planned" && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            )}>
                              {statusLabel(migration.status)}
                            </span>
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                              <span>{migration.resourcesMigrated} / {migration.totalResources} resources</span>
                              <Button variant="ghost" size="sm" className="h-7 px-0 text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 p-0">
                                View <ArrowRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            </div>
                            {migration.status === "in-progress" && (
                              <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${migration.progress}%` }} />
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Migration Timeline */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Migration Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {migrations.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-10 w-10 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-slate-400">No migration activity yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentMigrations.map((migration, index) => (
                          <div key={migration.id} className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                migration.status === "completed" 
                                  ? "bg-emerald-100 dark:bg-emerald-900/30" 
                                  : migration.status === "in-progress"
                                  ? "bg-blue-100 dark:bg-blue-900/30"
                                  : "bg-amber-100 dark:bg-amber-900/30"
                              )}>
                                {migration.status === "completed" ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                ) : migration.status === "in-progress" ? (
                                  <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {migration.name}
                                </h4>
                                <span className="text-xs text-gray-500 dark:text-slate-400">{migration.dateTime}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{migration.type}</p>
                              {migration.status === "in-progress" && (
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                                    style={{ width: `${migration.progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar Widgets */}
              <div className="space-y-4">
                {/* Migration Summary */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Migration Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Completed</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{totalCompleted()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">In Progress</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{totalInProgress()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Planned</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{totalPlanned()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Migrated */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Data Migrated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalResourcesMigrated}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Resources migrated
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Tracking */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                      Progress Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-3xl font-bold text-azure-600 dark:text-azure-400">
                        {migrations.length > 0 ? `${overallProgress}%` : "0%"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Overall completion
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