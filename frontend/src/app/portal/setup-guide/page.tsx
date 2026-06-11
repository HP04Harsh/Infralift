"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, Terminal, Shield, CheckCircle, ExternalLink,
  Compass, Settings, Cpu, BarChart3, Lock, Users, ChevronRight,
  Server, Cloud, Activity, Zap, Eye, AlertTriangle, Info, Mail,
  Wifi, Globe, Database, UserCheck, Clock, Key, Sliders, TrendingUp
} from "lucide-react";

const sections = [
  { id: "guidance", label: "Portal Guidance", icon: Compass, desc: "Platform overview & architecture" },
  { id: "setup", label: "Portal Setup", icon: Terminal, desc: "Azure configuration steps" },
  { id: "agents", label: "Agents Guide", icon: Cpu, desc: "Agent roles & capabilities" },
  { id: "consumption", label: "Consumption Model", icon: BarChart3, desc: "Usage & billing tracking" },
  { id: "security", label: "Portal Security & Shutdown", icon: Lock, desc: "Security & proper shutdown" },
  { id: "roles", label: "User Roles", icon: Users, desc: "Permissions & access levels" },
];

const agents = [
  { name: "Provisioning Agent", icon: Cloud, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/30", desc: "Automates Azure resource provisioning using Terraform and ARM templates. Supports VMs, databases, networking, and serverless resources with policy enforcement." },
  { name: "Assessment Agent", icon: Activity, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/30", desc: "Scans existing Azure infrastructure to evaluate security posture, cost optimization opportunities, and performance bottlenecks. Generates actionable recommendations." },
  { name: "Migration Agent", icon: Server, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30", desc: "Orchestrates lift-and-shift and re-platform migrations from on-premises or other clouds to Azure. Tracks progress, validates dependencies, and rolls back on failure." },
  { name: "Compliance Agent", icon: Shield, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/30", desc: "Monitors resources against CIS, HIPAA, PCI-DSS, GDPR, SOC 2, and NIST frameworks. Auto-remediates policy violations and generates audit-ready reports." },
  { name: "ITSM Agent", icon: Settings, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/30", desc: "Integrates with ServiceNow, Jira, and email for incident, problem, change, and service request management. Tracks SLAs and escalations automatically." },
  { name: "Monitoring Agent", icon: Eye, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/30", desc: "Provides real-time dashboards for CPU, memory, network, and error rates. Supports custom alert thresholds, anomaly detection, and auto-fix workflows." },
];

const azureSteps = [
  { step: "1", title: "Create Azure Resource Group", desc: "Create a resource group to hold all AI resources.", command: "az group create --name infralift-ai-rg --location eastus" },
  { step: "2", title: "Deploy Azure OpenAI Service", desc: "Deploy an Azure OpenAI resource within the resource group.", command: "az cognitiveservices account create --name infralift-openai --resource-group infralift-ai-rg --kind OpenAI --sku S0 --location eastus --yes" },
  { step: "3", title: "Deploy a Model", desc: "Deploy a GPT model in Azure AI Studio or via CLI.", command: "az cognitiveservices account deployment create --name infralift-openai --resource-group infralift-ai-rg --deployment-name gpt-4 --model-name gpt-4 --model-version 0613 --model-format OpenAI" },
  { step: "4", title: "Grant Permissions", desc: "Assign the Cognitive Services OpenAI User role.", command: 'az role assignment create --assignee {user-or-sp-object-id} --role "Cognitive Services OpenAI User" --scope /subscriptions/{subscription-id}/resourceGroups/infralift-ai-rg/providers/Microsoft.CognitiveServices/accounts/infralift-openai' },
  { step: "5", title: "Get Keys & Endpoint", desc: "Retrieve the endpoint URL and API key.", command: "az cognitiveservices account keys list --name infralift-openai --resource-group infralift-ai-rg" },
  { step: "6", title: "Create Service Principal", desc: "Create a service principal for automated agent access.", command: "az ad sp create-for-rbac --name infralift-sp --role Contributor --scopes /subscriptions/{subscription-id}" },
  { step: "7", title: "Configure Redis Cache", desc: "Deploy Redis for session and state management.", command: "az redis create --name infralift-cache --resource-group infralift-ai-rg --location eastus --sku Basic --vm-size C0 --enable-non-ssl-port" },
  { step: "8", title: "Set Environment Variables", desc: "Configure required environment variables in your deployment.", command: "# INFALIFT_API_URL, INFALIFT_REDIS_URL, INFALIFT_AZURE_TENANT_ID, INFALIFT_AZURE_CLIENT_ID, INFALIFT_AZURE_CLIENT_SECRET" },
];

const roles = [
  { role: "Admin", permissions: "Full access to all portal features, user management, billing, and system configuration", access: "All modules", badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" },
  { role: "Editor", permissions: "Create and modify resources, manage agents, view monitoring and compliance", access: "All except user mgmt & billing", badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  { role: "Reader", permissions: "View-only access to dashboards, monitoring, compliance reports, and guides", access: "Dashboard, Monitoring, Setup Guide", badge: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400" },
  { role: "ITSM Engineer", permissions: "Manage tickets, SLAs, incidents, and service requests. View monitoring.", access: "ITSM, Monitoring, Setup Guide", badge: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400" },
  { role: "Compliance Officer", permissions: "Run compliance scans, view violations, generate audit reports, manage frameworks.", access: "Compliance, Monitoring, Setup Guide", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
];

export default function PortalSetupGuidePage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("guidance");

  const SectionNav = () => (
    <nav className="space-y-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 shadow-sm sticky top-6">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
              isActive
                ? "bg-azure-50 dark:bg-azure-900/30 text-azure-700 dark:text-azure-300 shadow-sm"
                : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-azure-500" : "text-gray-400 dark:text-slate-500")} />
            <span className="truncate">{section.label}</span>
            {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto text-azure-400" />}
          </button>
        );
      })}
    </nav>
  );

  const renderGuidance = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-azure-50 to-blue-50 dark:from-azure-950/30 dark:to-blue-950/30 rounded-xl border border-azure-100 dark:border-azure-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-azure-100 dark:bg-azure-900/30 rounded-xl flex items-center justify-center">
            <Compass className="h-6 w-6 text-azure-600 dark:text-azure-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Portal Guidance</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Overview of the Infralift platform</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">What is Infralift?</h3>
        <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
          Infralift is a production-grade Azure automation platform that provides intelligent agent-based management for your Azure infrastructure. 
          It offers onboarding wizards, real-time monitoring, compliance scanning, ITSM ticketing, and automated provisioning — all through a 
          unified portal interface. Built with a modern Next.js frontend and FastAPI backend, it scales from single-subscription management to 
          enterprise multi-tenant deployments.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Architecture Overview</h3>
        <div className="bg-gray-900 dark:bg-slate-950 rounded-xl p-5 border border-gray-700 dark:border-slate-800 overflow-x-auto">
          <pre className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre">
{`┌─────────────────────────────────────────────────────────────────┐
│                        Infralift Portal                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Next.js 14 App   │  │  FastAPI      │  │  Redis Cache      │  │
│  │  (TypeScript)     │◀─▶  Backend      │◀─▶  (Sessions)       │  │
│  │  TailwindCSS      │  │  Python 3.9+  │  │  24h TTL          │  │
│  └────────┬─────────┘  └──────┬───────┘  └──────────────────┘  │
│           │                   │                                  │
│           └───────────────────┼──────────────────────────────────┘
│                               │                                   │
│  ┌────────────────────────────┴──────────────────────────────┐  │
│  │                    Agent Engine                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │Provision │ │Assessment│ │Migration │ │Compliance│    │  │
│  │  │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  │  ┌──────────┐ ┌──────────┐                                │  │
│  │  │ ITSM     │ │Monitoring│                                │  │
│  │  │ Agent    │ │  Agent   │                                │  │
│  │  └──────────┘ └──────────┘                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                               │                                   │
│  ┌────────────────────────────┴──────────────────────────────┐  │
│  │                    Azure Tenant                            │  │
│  │  Resource Groups · VMs · Databases · Networking · AI      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘`}</pre>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Key Capabilities</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
            {["AI-powered infrastructure automation", "Real-time monitoring & alerting", "Multi-framework compliance scanning", "ITSM integration with SLA tracking", "One-click Azure resource provisioning", "Role-based access control"].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-azure-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Green Neon Status Indicator</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed mb-3">
            The green neon glow on service cards indicates live operational health. Each status maps to:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Healthy</span>
              <span className="text-gray-500">— Service operating normally</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">Degraded</span>
              <span className="text-gray-500">— Partial outage or latency</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <span className="text-red-600 dark:text-red-400 font-medium">Down</span>
              <span className="text-gray-500">— Service unavailable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-azure-50 to-blue-50 dark:from-azure-950/30 dark:to-blue-950/30 rounded-xl border border-azure-100 dark:border-azure-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-azure-100 dark:bg-azure-900/30 rounded-xl flex items-center justify-center">
            <Terminal className="h-6 w-6 text-azure-600 dark:text-azure-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Portal Setup</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Step-by-step Azure configuration for Infralift agents</p>
          </div>
        </div>
      </div>

      {azureSteps.map((s, i) => (
        <motion.div
          key={s.step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i }}
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-azure-100 dark:bg-azure-900/30 flex items-center justify-center">
              <span className="text-sm font-bold text-azure-600 dark:text-azure-400">{s.step}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{s.title}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{s.desc}</p>
            </div>
          </div>
          <div className="ml-13">
            <CodeBlock command={s.command} />
          </div>
        </motion.div>
      ))}

      <div className="bg-gradient-to-r from-azure-50 to-purple-50 dark:from-azure-950/30 dark:to-purple-950/30 rounded-xl p-5 border border-azure-100 dark:border-azure-900/50">
        <div className="flex items-start gap-3">
          <ExternalLink className="h-5 w-5 text-azure-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-azure-700 dark:text-azure-400 mb-1">Need more help?</p>
            <p className="text-sm text-azure-600 dark:text-azure-300/70">Visit Azure Portal documentation for detailed guides on service principal setup, permission management, and Azure OpenAI configuration.</p>
            <a href="https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 font-medium mt-3">
              Open Azure OpenAI Portal <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAgents = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-azure-50 to-blue-50 dark:from-azure-950/30 dark:to-blue-950/30 rounded-xl border border-azure-100 dark:border-azure-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-azure-100 dark:bg-azure-900/30 rounded-xl flex items-center justify-center">
            <Cpu className="h-6 w-6 text-azure-600 dark:text-azure-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Agents Guide</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Understanding each agent's role and capabilities</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {agents.map((agent, i) => {
          const Icon = agent.icon;
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", agent.bg)}>
                  <Icon className={cn("h-5 w-5", agent.color)} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">{agent.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderConsumption = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-azure-50 to-blue-50 dark:from-azure-950/30 dark:to-blue-950/30 rounded-xl border border-azure-100 dark:border-azure-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-azure-100 dark:bg-azure-900/30 rounded-xl flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-azure-600 dark:text-azure-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Consumption Model</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">How agent usage is tracked and billed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Agent Time</h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">Agents track active processing time in milliseconds. Each AI inference, tool call, and workflow execution is measured. Billing is based on total active time across all agent invocations per billing cycle.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="h-5 w-5 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">API Call Tracking</h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">Every Azure API, OpenAI inference, and Redis operation is logged. The portal tracks request volume, latency percentiles, and error rates. Usage reports are available in the dashboard.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Resource Consumption</h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">Each monitored Azure resource contributes to your consumption baseline. Resources are counted per subscription per day. Idle resources can be excluded to optimize costs.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Billing Tiers</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <span className="font-medium text-gray-900 dark:text-white">Free</span>
              <span className="text-gray-500">Up to 5 resources, 1 agent</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <span className="font-medium text-gray-900 dark:text-white">Pro</span>
              <span className="text-gray-500">Up to 50 resources, all agents</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <span className="font-medium text-gray-900 dark:text-white">Enterprise</span>
              <span className="text-gray-500">Unlimited resources, custom agents</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-azure-50 to-blue-50 dark:from-azure-950/30 dark:to-blue-950/30 rounded-xl border border-azure-100 dark:border-azure-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-azure-100 dark:bg-azure-900/30 rounded-xl flex items-center justify-center">
            <Lock className="h-6 w-6 text-azure-600 dark:text-azure-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Portal Security & Shutdown</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Security best practices and graceful shutdown procedures</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Security Measures</h3>
          </div>
          <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
            {["Role-based access control with granular permissions", "Session-based authentication with 24-hour TTL", "All API traffic encrypted over TLS 1.2+", "Audit logging for all user and agent actions", "Redis session store with automatic expiration", "No secrets stored in code — all via environment variables"].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Proper Shutdown Procedure</h3>
          </div>
          <ol className="space-y-2 text-xs text-gray-600 dark:text-slate-300 list-decimal list-inside">
            <li>Stop all active agent workflows from the dashboard</li>
            <li>Wait for in-progress tasks to complete or cancel them</li>
            <li>Export any pending compliance or audit reports</li>
            <li>Stop the backend server (Ctrl+C or systemctl stop)</li>
            <li>Stop the frontend dev server if running locally</li>
            <li>Redis data persists but sessions will expire within 24h</li>
          </ol>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-5 w-5 text-azure-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Point of Contact</h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mb-3">For support, security concerns, or feature requests, reach out to the Infralift team:</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-700 dark:text-slate-300">support@infralift.io</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-700 dark:text-slate-300">docs.infralift.io</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-700 dark:text-slate-300">Report vulnerabilities: security@infralift.io</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Status Indicator Legend</h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mb-3">
            Every service card in the Portal Monitoring page displays a live status with a neon glow:
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">Healthy</span>
              <span className="text-emerald-600/70 dark:text-emerald-400/70">— Service operating normally</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
              <span className="text-amber-700 dark:text-amber-300 font-medium">Degraded</span>
              <span className="text-amber-600/70 dark:text-amber-400/70">— Elevated latency or partial outage</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <span className="text-red-700 dark:text-red-300 font-medium">Down</span>
              <span className="text-red-600/70 dark:text-red-400/70">— Service unavailable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-azure-50 to-blue-50 dark:from-azure-950/30 dark:to-blue-950/30 rounded-xl border border-azure-100 dark:border-azure-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-azure-100 dark:bg-azure-900/30 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-azure-600 dark:text-azure-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Roles</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Available roles and their permissions within the portal</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[120px]">Role</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[280px]">Permissions</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 min-w-[180px]">Access</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r, i) => (
                <tr key={r.role} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", r.badge)}>{r.role}</span>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-gray-600 dark:text-slate-300">{r.permissions}</td>
                  <td className="py-3.5 px-4 text-sm text-gray-600 dark:text-slate-300">{r.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {roles.map((r, i) => {
          const roleIcons = [Shield, UserCheck, Eye, Settings, Shield];
          const Icon = roleIcons[i];
          return (
            <motion.div
              key={r.role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", i === 0 ? "bg-purple-50 dark:bg-purple-900/30" : i === 1 ? "bg-blue-50 dark:bg-blue-900/30" : i === 2 ? "bg-gray-50 dark:bg-slate-900" : i === 3 ? "bg-cyan-50 dark:bg-cyan-900/30" : "bg-emerald-50 dark:bg-emerald-900/30")}>
                  <Icon className={cn("h-4 w-4", i === 0 ? "text-purple-500" : i === 1 ? "text-blue-500" : i === 2 ? "text-gray-500" : i === 3 ? "text-cyan-500" : "text-emerald-500")} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{r.role}</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">{r.permissions}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "guidance": return renderGuidance();
      case "setup": return renderSetup();
      case "agents": return renderAgents();
      case "consumption": return renderConsumption();
      case "security": return renderSecurity();
      case "roles": return renderRoles();
      default: return renderGuidance();
    }
  };

  const activeSectionMeta = sections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator />
        <main className="p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 mb-4">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-azure-100 dark:bg-azure-900/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-azure-600 dark:text-azure-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portal Setup Guide</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {activeSectionMeta?.desc ?? "Comprehensive guide to Infralift"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-56 flex-shrink-0">
                <SectionNav />
              </div>
              <div className="flex-1 min-w-0">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {renderContent()}
                </motion.div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}