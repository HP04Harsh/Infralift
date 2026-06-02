"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantInputModule } from "@/components/assistant/AssistantInputModule";
import { 
  AlertTriangle, FileText, Settings, 
  HelpCircle, Plus, Search, Clock, CheckCircle, User, Ticket, Activity, LayoutDashboard as LayoutDashboardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ITSMAgentPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{column: string; direction: "asc" | "desc"} | null>(null);

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev?.column === column) {
        return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "asc" };
    });
  };

  const quickActions = [
    {
      label: "Create Incident",
      prompt: "Create a new incident for [Issue Description] affecting [Service Name] with [Priority Level].",
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      iconBg: "bg-red-50 dark:bg-red-900/30",
    },
    {
      label: "Service Request",
      prompt: "Create a service request for [Request Description] with [Required Details].",
      icon: <HelpCircle className="h-4 w-4 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Change Request",
      prompt: "Create a change request for [Change Description] with [Impact Assessment] and [Rollback Plan].",
      icon: <Settings className="h-4 w-4 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
    },
    {
      label: "Track Ticket Status",
      prompt: "Check the status of ticket [Ticket Number] and provide latest updates.",
      icon: <Ticket className="h-4 w-4 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Knowledge Base",
      prompt: "Search the knowledge base for solutions related to [Problem Description].",
      icon: <FileText className="h-4 w-4 text-green-500" />,
      iconBg: "bg-green-50 dark:bg-green-900/30",
    },
    {
      label: "SLA Compliance",
      prompt: "Check SLA compliance status for [Service Name] and identify any potential breaches.",
      icon: <Clock className="h-4 w-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      label: "Escalate Ticket",
      prompt: "Escalate ticket [Ticket Number] to [Escalation Level] due to [Reason].",
      icon: <Activity className="h-4 w-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
    },
  ];

  const placeholderVariants = [
    "Create high priority incident for production outage...",
    "Generate service request for VM deployment...",
    "Track SLA compliance for active incidents...",
  ];

  const createNewCards = [
    {
      title: "Incident",
      description: "Report unplanned service interruptions",
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      iconBg: "bg-red-100 dark:bg-red-900/40",
      prompt: "I want to create a new incident ticket. Please help me report an unplanned service interruption affecting [service name]. The issue is [description], impact is [low/medium/high/critical], and priority should be [priority level]. Please create the incident with appropriate details and assign it to the right team.",
    },
    {
      title: "Service Request",
      description: "Request IT services or information",
      icon: <HelpCircle className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      prompt: "I want to create a service request. Please help me request [service or information] with the following details: [specific requirements]. Include any necessary approvals, estimated completion time, and assign it to the appropriate team.",
    },
    {
      title: "Change Request",
      description: "Request changes to IT infrastructure",
      icon: <Settings className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      prompt: "I want to create a change request for [change description]. Please help me document the change including impact assessment, risk analysis, rollback plan, approval requirements, and implementation timeline. Ensure all necessary stakeholders are identified.",
    },
    {
      title: "Problem",
      description: "Report underlying causes of incidents",
      icon: <FileText className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      prompt: "I want to create a problem ticket to investigate the root cause of recurring incidents. Please help me document the problem including incident history, known errors, workarounds, and investigation plan. Assign to the appropriate team for root cause analysis.",
    },
  ];

  const recentTickets = [
    { id: "INC-001", title: "VM connectivity failure", type: "Incident", priority: "Critical", status: "In Progress", assignee: "Harsh Pardhi", time: "30 min ago" },
    { id: "SR-042", title: "New user access request", type: "Service Request", priority: "Medium", status: "Pending", assignee: "Unassigned", time: "2 hours ago" },
    { id: "CR-015", title: "Database upgrade", type: "Change Request", priority: "High", status: "Approved", assignee: "DB Team", time: "1 day ago" },
    { id: "PRB-008", title: "Recurring backup failures", type: "Problem", priority: "High", status: "Investigating", assignee: "Harsh Pardhi", time: "2 days ago" },
  ];

  const filteredAndSortedTickets = recentTickets
    .filter(ticket => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        ticket.id.toLowerCase().includes(q) ||
        ticket.title.toLowerCase().includes(q) ||
        ticket.type.toLowerCase().includes(q) ||
        ticket.priority.toLowerCase().includes(q) ||
        ticket.status.toLowerCase().includes(q) ||
        ticket.assignee.toLowerCase().includes(q) ||
        ticket.time.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const aVal = String(a[sortConfig.column as keyof typeof a] ?? "").toLowerCase();
      const bVal = String(b[sortConfig.column as keyof typeof b] ?? "").toLowerCase();
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      return aVal.localeCompare(bVal) * dir;
    });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "High":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "Medium":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "Low":
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-700";
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
      case "Pending":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "Approved":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "Investigating":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
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
                    ITSM Agent
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Manage IT service requests, incidents, and changes.
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
                    size="sm" 
                    onClick={() => router.push('/itsm/chat')}
                    className="h-8 bg-azure-500 hover:bg-azure-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Ticket
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Assistant Section */}
            <AssistantInputModule
              title="ITSM Assist"
              icon={<Ticket className="h-5 w-5 text-azure-500" />}
              quickActions={quickActions}
              placeholderVariants={placeholderVariants}
              className="mb-6"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Create New */}
                <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      Create New
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {createNewCards.map((card, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" }}
                          onClick={() => router.push(`/itsm/chat?prompt=${encodeURIComponent(card.prompt)}`)}
                          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-azure-300 dark:hover:border-azure-700"
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", card.iconBg)}>
                            {card.icon}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {card.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {card.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Tickets */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Ticket className="h-5 w-5" />
                      Recent Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tickets..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-azure-500"
                        />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[100px] cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                onClick={() => handleSort("id")}>
                              Ticket ID {sortConfig?.column === "id" && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[180px] cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                onClick={() => handleSort("title")}>
                              Title {sortConfig?.column === "title" && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[100px] cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                onClick={() => handleSort("type")}>
                              Type {sortConfig?.column === "type" && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[80px] cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                onClick={() => handleSort("priority")}>
                              Priority {sortConfig?.column === "priority" && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[100px] cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                onClick={() => handleSort("status")}>
                              Status {sortConfig?.column === "status" && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[120px] cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                onClick={() => handleSort("assignee")}>
                              Assignee {sortConfig?.column === "assignee" && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[100px] cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300"
                                onClick={() => handleSort("time")}>
                              Time {sortConfig?.column === "time" && (sortConfig.direction === "asc" ? "\u2191" : "\u2193")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedTickets.map((ticket) => (
                            <tr key={ticket.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="py-3 px-4 text-sm font-medium text-azure-600 dark:text-azure-400">{ticket.id}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{ticket.title}</td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300">{ticket.type}</td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                                  getPriorityColor(ticket.priority)
                                )}>
                                  {ticket.priority}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-medium",
                                  getStatusColor(ticket.status)
                                )}>
                                  {ticket.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {ticket.assignee}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-500 dark:text-slate-400">
                                <span>{ticket.time}</span>
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
                {/* My Tickets */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <User className="h-4 w-4" />
                      My Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Open</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">5</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">In Progress</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Resolved</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">12</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SLA Status */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      SLA Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Breached</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">1</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">At Risk</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">On Track</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">8</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Metrics */}
                <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Weekly Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Avg Resolution Time</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">4.2h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">First Response Time</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">15m</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Customer Satisfaction</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">4.8/5</span>
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