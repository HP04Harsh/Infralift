"use client";

import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantInputModule } from "@/components/assistant/AssistantInputModule";
import { 
  ArrowRight, History, Plus, Database, 
  Server, Cloud, HardDrive, Globe, Container, Clock, Activity,
  CheckCircle, TrendingUp, LayoutDashboard as LayoutDashboardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function MigrationAgentPage() {
  const router = useRouter();

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

  const migrationScenarios = [
    {
      title: "Lift & Shift",
      description: "Migrate VMs and infrastructure as-is",
      icon: <Server className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      prompt: "I want to perform a lift and shift migration of my on-premises virtual machines to Azure. Please analyze my current infrastructure, recommend the appropriate Azure VM sizes, network configuration, and migration strategy using Azure Migrate. Include considerations for data transfer, downtime, and post-migration validation.",
    },
    {
      title: "Replatform",
      description: "Modernize applications during migration",
      icon: <Container className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      prompt: "I want to migrate and modernize my applications to Azure with containerization. Please analyze my current application architecture, recommend containerization strategy using Docker, deployment to Azure Kubernetes Service or Container Apps, and provide a modernization roadmap.",
    },
    {
      title: "Database Migration",
      description: "Migrate databases to Azure SQL/PostgreSQL",
      icon: <Database className="h-5 w-5 text-green-600" />,
      iconBg: "bg-green-100 dark:bg-green-900/40",
      prompt: "I want to migrate my on-premises databases to Azure. Please analyze my current database infrastructure (SQL Server, Oracle, MySQL), recommend the appropriate Azure database service (Azure SQL Database, SQL Managed Instance, Azure Database for MySQL/PostgreSQL), and provide a migration plan using Azure Database Migration Service.",
    },
    {
      title: "VM Migration",
      description: "Migrate virtual machines to Azure",
      icon: <Server className="h-5 w-5 text-cyan-600" />,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
      prompt: "I want to migrate my virtual machines from on-premises or another cloud to Azure. Please analyze my current VM infrastructure, recommend the appropriate Azure VM series and sizes, plan the network configuration, and provide a step-by-step migration strategy using Azure Migrate.",
    },
    {
      title: "Storage Migration",
      description: "Migrate storage accounts and data",
      icon: <HardDrive className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      prompt: "I want to migrate my data to Azure storage. Please analyze my current storage infrastructure, recommend the appropriate Azure storage services (Blob Storage, Azure Files, Data Lake Storage), and provide a data migration plan using Azure Data Factory, AzCopy, or Azure Storage Explorer.",
    },
    {
      title: "App Migration",
      description: "Migrate applications to App Service",
      icon: <Cloud className="h-5 w-5 text-indigo-600" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
      prompt: "I want to migrate my web applications to Azure App Service. Please analyze my current application stack, recommend the appropriate App Service plan and runtime, plan the migration process, and provide configuration recommendations for scaling, monitoring, and deployment pipelines.",
    },
  ];

  const recentMigrations = [
    { name: "prod-web-servers", type: "Lift & Shift", status: "completed", progress: 100, time: "1 day ago" },
    { name: "customer-db", type: "Database Migration", status: "in-progress", progress: 67, time: "2 hours ago" },
    { name: "legacy-app", type: "Replatform", status: "completed", progress: 100, time: "3 days ago" },
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
            <AssistantInputModule
              title="Migration Assist"
              icon={<TrendingUp className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              agentType="migration"
              className="mb-6"
            />

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {migrationScenarios.map((scenario, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                          onClick={() => router.push(`/migration/chat?prompt=${encodeURIComponent(scenario.prompt)}`)}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", scenario.iconBg)}>
                            {scenario.icon}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {scenario.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                            {scenario.description}
                          </p>
                          <Button variant="ghost" size="sm" className="h-7 px-0 text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 p-0">
                            Start <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
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
                    <div className="space-y-4">
                      {recentMigrations.map((migration, index) => (
                        <div key={index} className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              migration.status === "completed" 
                                ? "bg-emerald-100 dark:bg-emerald-900/30" 
                                : "bg-blue-100 dark:bg-blue-900/30"
                            )}>
                              {migration.status === "completed" ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {migration.name}
                              </h4>
                              <span className="text-xs text-gray-500 dark:text-slate-400">{migration.time}</span>
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
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">12</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">In Progress</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Planned</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">5</span>
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
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">2.4 TB</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Total data migrated
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
                      <p className="text-3xl font-bold text-azure-600 dark:text-azure-400">67%</p>
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