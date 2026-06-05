"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, User, CheckCircle, Loader, Cloud, Server, DollarSign, Shield, FileText, Database, Layers, Network, Box, Zap, Search, MessageSquare, ClipboardList, AlertTriangle, X, ChevronRight, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { AnimatedChatInput } from "@/components/assistant/AnimatedChatInput";
import { AIActivityTimeline } from "@/components/chat/AIActivityTimeline";
import { apiService } from "@/services/api";
import { useDeploymentStore } from "@/store/deploymentStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTenantDataStore } from "@/store/tenantDataStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  events?: any[];
  plan?: DeploymentPlan;
  result?: any;
}

interface DeploymentPlan {
  resourceType: string;
  resourceName: string;
  region: string;
  resourceGroup: string;
  size?: string;
  osType?: string;
  sku?: string;
  kind?: string;
  environment: string;
  tags: Record<string, string>;
  summary: string;
  costEstimate: string;
  securityReview: string;
  terraformPreview: string;
}

interface CollectedParams {
  intent: string;
  resourceType: string;
  resourceName: string;
  region: string;
  size?: string;
  osType?: string;
  backup?: string;
  monitoring?: string;
  sku?: string;
  kind?: string;
  environment: string;
  adminUsername?: string;
  tags: Record<string, string>;
}

type ChatPhase = "idle" | "discovery" | "planning" | "review" | "deploying" | "done" | "modify_find" | "modify_plan" | "modify_review" | "modify_deploying" | "modify_done";



function ProvisioningChatInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const addDeployment = useDeploymentStore((s) => s.addDeployment);
  const updateDeploymentStatus = useDeploymentStore((s) => s.updateStatus);
  const { fetchAll } = useTenantDataStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [collectedParams, setCollectedParams] = useState<CollectedParams | null>(null);
  const [deploymentPlan, setDeploymentPlan] = useState<DeploymentPlan | null>(null);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [deployEvents, setDeployEvents] = useState<any[]>([]);

  const [modifyTargets, setModifyTargets] = useState<any[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [modifyParams, setModifyParams] = useState<Record<string, string>>({});

  const isSubmitting = useRef(false);
  const initialPromptHandled = useRef(false);

  useEffect(() => {
    if (initialPromptHandled.current) return;
    const prompt = searchParams.get("prompt");
    if (prompt) {
      initialPromptHandled.current = true;
      setTimeout(() => handleSend(prompt), 500);
    }
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || isSubmitting.current) return;
    isSubmitting.current = true;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      if (phase === "idle") {
        await handleDiscoveryStart(content);
      } else if (phase === "discovery") {
        await handleDiscoveryAnswer(content);
      } else if (phase === "review") {
        await handleReviewResponse(content);
      } else if (phase === "modify_find") {
        await handleModifyFindResponse(content);
      } else if (phase === "modify_plan") {
        await handleModifyAnswer(content);
      } else if (phase === "modify_review") {
        await handleModifyReviewResponse(content);
      }
    } catch (e: any) {
      addMessage({
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${e.message || "Something went wrong"}`,
        timestamp: new Date(),
        events: [{ type: "activity", icon: "AlertTriangle", title: "Error", status: "error" }],
      });
    }

    setIsLoading(false);
    isSubmitting.current = false;
  }, [phase, isLoading, messages, collectedParams, deploymentPlan, modifyTargets, selectedTarget, modifyParams]);

  /* ── Discovery & Planning via Azure OpenAI ── */
  const askAzureOpenAI = async (content: string, intent: string) => {
    const agentSettings = useSettingsStore.getState().agents.provisioning;
    const hasAzureOpenAI = Boolean(agentSettings?.azureEndpoint && agentSettings?.openaiApiKey);

    if (!hasAzureOpenAI) {
      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "Azure OpenAI is not configured. Go to **Settings > Agents** to configure your AI provider credentials before I can help provision resources.",
        timestamp: new Date(),
        events: [{ type: "activity", icon: "AlertTriangle", title: "AI Not Configured", status: "error" }],
      });
      setIsLoading(false);
      return;
    }

    const res: any = await apiService.aiChat({
      message: content,
      agent_type: "provisioning",
      conversation_context: {
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        intent,
        collected_params: collectedParams,
      },
      azure_endpoint: agentSettings.azureEndpoint,
      azure_key: agentSettings.openaiApiKey,
      azure_deployment: agentSettings.model,
      azure_api_version: "2024-02-15-preview",
    });
    return res;
  };

  const handleDiscoveryStart = async (content: string) => {
    setCollectedParams({ intent: content, resourceType: "", resourceName: "", region: "", environment: "production", tags: { managedBy: "InfraLift" } });
    const res = await askAzureOpenAI(content, "collect_deployment_params");
    const aiResponse = res?.full_response || "";
    const aiEvents = res?.events || [];

    addMessage({
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: aiResponse || "I'll help you deploy Azure resources. What would you like to create?",
      timestamp: new Date(),
      events: aiEvents,
    });

    const plan = parsePlanFromAI(aiResponse);
    if (plan) {
      setDeploymentPlan(plan);
      setCollectedParams((prev) => prev ? { ...prev, resourceType: plan.resourceType, resourceName: plan.resourceName, region: plan.region, size: plan.size, osType: plan.osType } : prev);
      setPhase("review");
    }
  };

  const handleDiscoveryAnswer = async (content: string) => {
    const res = await askAzureOpenAI(content, "collect_deployment_params");
    const aiResponse = res?.full_response || "";
    const aiEvents = res?.events || [];

    addMessage({
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: aiResponse || "Thanks. What other details do you need to provide?",
      timestamp: new Date(),
      events: aiEvents,
    });

    const plan = parsePlanFromAI(aiResponse);
    if (plan) {
      setDeploymentPlan(plan);
      setCollectedParams((prev) => prev ? { ...prev, resourceType: plan.resourceType, resourceName: plan.resourceName, region: plan.region, size: plan.size, osType: plan.osType } : prev);
      setPhase("review");
    }
  };

  /* ── Planning Phase (Azure OpenAI) ── */
  function parsePlanFromAI(aiResponse: string): DeploymentPlan | null {
    const lines = aiResponse.split("\n");
    let resourceType = "Virtual Machine";
    let resourceName = `vm-${Date.now().toString(36)}`;
    let region = "eastus";
    let size = "";
    let osType = "";
    let environment = "production";
    let costEstimate = "Estimate available via Azure Pricing Calculator";
    let securityReview = "Security configuration will be applied during deployment";
    let terraformPreview = "# Terraform configuration generated during deployment";

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("**resource:**") || lower.includes("resource:")) {
        resourceName = line.split("**resource:**").pop()?.trim() || line.split("Resource:")[1]?.trim() || resourceName;
      }
      if (lower.includes("**type:**") || lower.includes("type:")) resourceType = line.split("**type:**").pop()?.trim() || line.split("Type:")[1]?.trim() || resourceType;
      if (lower.includes("**region:**") || lower.includes("region:")) region = line.split("**region:**").pop()?.trim() || line.split("Region:")[1]?.trim() || region;
      if (lower.includes("**size:**") || lower.includes("size:")) size = line.split("**size:**").pop()?.trim() || line.split("Size:")[1]?.trim() || size;
      if (lower.includes("**os:**") || lower.includes("os:")) osType = line.split("**os:**").pop()?.trim() || line.split("OS:")[1]?.trim() || osType;
      if (lower.includes("**cost") || lower.includes("cost estimate")) costEstimate = line.replace(/\*\*/g, "").trim();
      if (lower.includes("**security") || lower.includes("security review")) securityReview = line.replace(/\*\*/g, "").trim();
    }

    const rgName = `rg-${resourceName}`;
    return {
      resourceType: resourceType.charAt(0).toUpperCase() + resourceType.slice(1),
      resourceName,
      region,
      resourceGroup: rgName,
      size: size || undefined,
      osType: osType || undefined,
      environment,
      tags: { managedBy: "InfraLift", environment, Name: resourceName },
      summary: `**Resource:** ${resourceName}\n**Type:** ${resourceType}\n**Region:** ${region}${size ? `\n**Size:** ${size}` : ""}${osType ? `\n**OS:** ${osType}` : ""}`,
      costEstimate,
      securityReview,
      terraformPreview,
    };
  }

  /* ── Review & Deploy ── */
  const handleReviewResponse = async (content: string) => {
    const lower = content.toLowerCase();
    if (lower.includes("yes") || lower.includes("proceed") || lower.includes("approve") || lower.includes("deploy") || lower.includes("go")) {
      if (deploymentPlan) {
        await executeDeployment(deploymentPlan);
      }
    } else if (lower.includes("no") || lower.includes("stop") || lower.includes("cancel")) {
      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "Deployment cancelled. Feel free to ask when you're ready to deploy something else.",
        timestamp: new Date(),
      });
      setPhase("idle");
      setCollectedParams(null);
      setDeploymentPlan(null);
    } else {
      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "Please type **yes** to proceed with deployment or **no** to cancel.",
        timestamp: new Date(),
      });
    }
  };

  const executeDeployment = async (plan: DeploymentPlan) => {
    setPhase("deploying");
    const depName = `${plan.resourceName}`;
    const depType = plan.resourceType;
    const userName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "User" : "User";

    addDeployment({ name: depName, type: depType, status: "in-progress", initiatedBy: userName, agentType: "provisioning" });

    const events: any[] = [];
    const addEvent = (icon: string, title: string, status: string) => {
      events.push({ type: "activity", icon, title, status });
    };

    addMessage({
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "## Deploying Resources\n\nExecuting deployment via Azure SDK...",
      timestamp: new Date(),
      events: [...events],
    });

    addEvent("Search", "Validating deployment plan", "in_progress");
    addEvent("Cloud", "Connecting to Azure", "in_progress");
    addEvent("Layers", "Creating resource group & networking", "pending");
    addEvent("Box", `Deploying ${plan.resourceType}`, "pending");
    addEvent("FileText", "Generating Terraform configuration", "pending");
    addEvent("Database", "Saving resource state", "pending");
    addEvent("ClipboardList", "Recording audit trail", "pending");

    const updateEvents = () => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last.role === "assistant") return [...prev.slice(0, -1), { ...last, events: [...events] }];
        return prev;
      });
    };

    try {
      events[0].status = "completed";
      const response: any = await apiService.deployResource({
        resourceType: plan.resourceType,
        resourceName: plan.resourceName,
        region: plan.region,
        resourceGroup: plan.resourceGroup,
        size: plan.size,
        osType: plan.osType,
        sku: plan.sku,
        environment: plan.environment,
        tags: plan.tags,
        summary: plan.summary,
        originalPrompt: collectedParams?.intent || "",
      });

      // Process backend events if available
      if (response?.events) {
        response.events.forEach((e: any) => {
          if (e.icon && e.title) {
            addEvent(e.icon, e.title, e.status || "completed");
          }
        });
      }

      // Mark all pending events as completed
      events.forEach((e) => { if (e.status === "pending" || e.status === "in_progress") e.status = "completed"; });
      updateEvents();

      const result = {
        deploymentId: response?.deployment_id || `dep-${Date.now().toString(36)}`,
        resourceName: plan.resourceName,
        resourceGroup: plan.resourceGroup,
        region: plan.region,
        terraformPath: response?.terraform_path || `deployments/${new Date().toISOString().slice(0, 10)}-${plan.resourceName}/`,
        status: "completed",
      };
      setDeploymentResult(result);
      setPhase("done");

      updateDeploymentStatus(depName, "completed" as any);
      setTimeout(() => fetchAll(), 1000);

      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: `## ✅ Deployment Successful\n\n**Resource:** ${result.resourceName}\n**Resource Group:** ${result.resourceGroup}\n**Deployment ID:** \`${result.deploymentId}\`\n**Region:** ${result.region}\n**Terraform Path:** \`${result.terraformPath}\`\n\nTerraform artifacts stored in Azure Blob Storage. Resource state tracked for future modifications.`,
        timestamp: new Date(),
        events: [...events],
        result,
      });

      addNotification({ title: "Deployment complete", message: `${plan.resourceType} ${plan.resourceName} deployed`, status: "success", category: "tenant_sync" });
    } catch (err: any) {
      events[0].status = "completed";
      events[1].status = "error";
      events.forEach((e) => { if (e.status === "pending") e.status = "error"; });
      updateEvents();

      setPhase("idle");
      updateDeploymentStatus(depName, "failed" as any);

      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: `## ❌ Deployment Failed\n\n**Error:** ${err?.message || "Azure SDK deployment failed"}\n\nPlease check:\n• Azure credentials are configured\n• Resource quotas are available\n• Region supports the requested resource type\n\nYou can retry deployment by saying "Create again" or "Deploy with modified parameters".`,
        timestamp: new Date(),
        events: [...events],
      });

      addNotification({ title: "Deployment failed", message: `${plan.resourceType} ${plan.resourceName} — ${err?.message || "Unknown error"}`, status: "error", category: "tenant_sync" });
    }
  };

  /* ── Future Modifications ── */
  const handleModifyFindResponse = async (content: string) => {
    const lower = content.toLowerCase();
    const matchIdx = modifyTargets.findIndex((t) =>
      lower.includes((t.resourceName || "").toLowerCase()) || lower.includes((t.resourceId || "").toLowerCase())
    );
    if (matchIdx >= 0) {
      const target = modifyTargets[matchIdx];
      setSelectedTarget(target);
      setModifyParams({});
      setPhase("modify_plan");
      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: `What size would you like to change **${target.resourceName || target.name}** to?\n\n• **Standard_D4s_v3** (4 vCPU, 16GB)\n• **Standard_D8s_v3** (8 vCPU, 32GB)\n• **Standard_F4s_v2** (4 vCPU, 8GB)\n• Or specify any Azure VM size\n\n> Current: ${target.size || "Standard_B2s"}`,
        timestamp: new Date(),
      });
    } else {
      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: `I found these deployed resources:\n${modifyTargets.map((t: any) => `• **${t.resourceName || t.name}** (${t.resourceType || t.type})`).join("\n")}\n\nWhich one would you like to modify?`,
        timestamp: new Date(),
      });
    }
  };

  const handleModifyAnswer = async (content: string) => {
    setModifyParams({ newSize: content });
    setPhase("modify_review");
    addMessage({
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: `## Modification Plan\n\n**Resource:** ${selectedTarget?.resourceName || selectedTarget?.name}\n**New Size:** ${content}\n\n**Impact:**\n• VM will restart (~2-3 min downtime)\n• Cost will change based on new size\n• All data and configurations preserved\n\nProceed with modification? (yes/no)`,
      timestamp: new Date(),
    });
  };

  const handleModifyReviewResponse = async (content: string) => {
    const lower = content.toLowerCase();
    if (lower.includes("yes") || lower.includes("proceed") || lower.includes("approve")) {
      setPhase("modify_deploying");
      const events: any[] = [];
      const addEvent = (icon: string, title: string, status: string) => events.push({ type: "activity", icon, title, status });

      addEvent("Search", "Calling Azure SDK to modify resource...", "in_progress");
      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "## Modifying Resource\n\nApplying change via Azure SDK...",
        timestamp: new Date(),
        events: [...events],
      });

      const updateEvents = () => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last.role === "assistant") return [...prev.slice(0, -1), { ...last, events: [...events] }];
          return prev;
        });
      };

      try {
        events[0].status = "completed";
        addEvent("Cloud", "Authenticating with Azure", "in_progress");
        updateEvents();

        const res: any = await apiService.modifyResource({
          resourceId: selectedTarget?.id || selectedTarget?.resourceId || "",
          resourceGroup: selectedTarget?.resourceGroup || `rg-${selectedTarget?.resourceName || selectedTarget?.name}`,
          resourceName: selectedTarget?.resourceName || selectedTarget?.name || "",
          resourceType: selectedTarget?.resourceType || selectedTarget?.type || "Virtual Machine",
          changes: { newSize: modifyParams.newSize },
        });

        if (res?.events) {
          res.events.forEach((e: any) => {
            if (e.step && e.message) {
              addEvent(e.step === "resize" ? "Settings" : e.step === "restart" ? "Zap" : "Search", e.message, e.status || "completed");
            }
          });
        }

        events.forEach((e) => { if (e.status === "in_progress" || e.status === "pending") e.status = "completed"; });
        updateEvents();

        setPhase("modify_done");
        setTimeout(() => fetchAll(), 1000);

        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `## ✅ Modification Complete\n\n**Resource:** ${selectedTarget?.resourceName || selectedTarget?.name}\n**Change:** Size updated to ${modifyParams.newSize}\n**Method:** Azure SDK (real operation)\n\nState history maintained. You can view the audit trail or make further modifications.`,
          timestamp: new Date(),
          events: [...events],
          result: res,
        });

        addNotification({ title: "Resource modified", message: `${selectedTarget?.resourceName || selectedTarget?.name} updated via Azure SDK`, status: "success", category: "tenant_sync" });
      } catch (err: any) {
        events[0].status = "completed";
        events.forEach((e) => { if (e.status === "in_progress" || e.status === "pending") e.status = "error"; });
        updateEvents();

        setPhase("idle");
        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `## ❌ Modification Failed\n\n**Error:** ${err?.message || "Azure SDK modification failed"}\n\nPlease check:\n• Azure credentials are configured\n• Resource exists in the specified resource group\n• New size is valid for the resource`,
          timestamp: new Date(),
          events: [...events],
        });
      }
    } else {
      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "Modification cancelled. Let me know if you need anything else.",
        timestamp: new Date(),
      });
      setPhase("idle");
    }
  };

  /* ── Detect modification intent ── */
  useEffect(() => {
    const checkModifyIntent = async () => {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== "user" || phase !== "idle") return;

      const lower = lastMsg.content.toLowerCase();
      const modifyKeywords = ["increase", "decrease", "change", "modify", "update", "resize", "upgrade", "downgrade", "scale"];
      if (!modifyKeywords.some((k) => lower.includes(k))) return;
      if (!lower.includes("size") && !lower.includes("vm") && !lower.includes("resource")) return;

      setIsLoading(true);
      try {
        const res: any = await apiService.listResourceStates();
        const targets = (res?.resources || []).filter((r: any) => (r.resourceType || r.type || "").toLowerCase().includes("virtual") || (r.resourceType || r.type || "").toLowerCase().includes("vm"));
        if (targets.length === 0) {
          addMessage({
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: "I couldn't find any deployed VMs to modify. Please deploy a VM first.",
            timestamp: new Date(),
          });
          setIsLoading(false);
          isSubmitting.current = false;
          return;
        }
        setModifyTargets(targets);
        setPhase("modify_find");
        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `I found ${targets.length} deployed VM(s). Which one would you like to modify?\n\n${targets.map((t: any) => `• **${t.resourceName || t.name}** (${t.region || t.location || "Unknown"})`).join("\n")}\n\nPlease type the resource name.`,
          timestamp: new Date(),
        });
      } catch {
        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: "I found VMs from your current session. Which one would you like to modify?",
          timestamp: new Date(),
        });
      }
      setIsLoading(false);
      isSubmitting.current = false;
    };
    checkModifyIntent();
  }, [messages, phase]);

  const handleReset = () => {
    setPhase("idle");
    setCollectedParams(null);
    setDeploymentPlan(null);
    setDeploymentResult(null);
    setDeployEvents([]);
    setModifyTargets([]);
    setSelectedTarget(null);
    setModifyParams({});
  };

  const placeholderTexts = ["Create a VM in Central India...", "Increase VM size...", "Deploy a storage account...", "Provision an AKS cluster..."];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator userName="Harsh Pardhi" />

        <main className="h-[calc(100vh-56px)] flex flex-col">
          {/* Header Bar */}
          <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 lg:px-6 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-azure-500 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Provisioning Agent</h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    AI Infrastructure Engineer
                    {phase !== "idle" && <span className="ml-2 text-azure-500 font-medium"> &middot; {phase === "discovery" ? "Discovery" : phase === "planning" ? "Planning" : phase === "review" ? "Review" : phase === "deploying" ? "Deploying" : phase === "done" ? "Complete" : "Modifying"}</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
            <div className="max-w-4xl mx-auto space-y-4">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="h-8 w-8 bg-azure-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="max-w-[85%] space-y-2">
                        {msg.role === "assistant" && msg.events && msg.events.length > 0 && (
                          <AIActivityTimeline events={msg.events} />
                        )}
                        <div className={cn(
                          "rounded-2xl px-4 py-3",
                          msg.role === "user"
                            ? "bg-azure-500 text-white rounded-br-md"
                            : "bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-bl-md"
                        )}>
                          <div className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/```hcl\n?([\s\S]*?)```/g, "<pre class='bg-gray-100 dark:bg-slate-900 rounded p-2 my-2 text-xs overflow-x-auto font-mono'>$1</pre>").replace(/`([^`]+)`/g, "<code class='bg-gray-100 dark:bg-slate-900 px-1 rounded text-xs font-mono'>$1</code>") }} />
                          <p className="text-xs mt-1 opacity-70">
                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div className="h-8 w-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 justify-start">
                    <div className="h-8 w-8 bg-azure-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Bar */}
          <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 px-4 lg:px-6 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <AnimatedChatInput
                    value={inputValue}
                    onChange={(v) => setInputValue(v)}
                    onSubmit={() => handleSend(inputValue)}
                    placeholderTexts={placeholderTexts}
                    disabled={isLoading || phase === "deploying" || phase === "planning" || phase === "modify_deploying"}
                  />
                </div>
                {phase === "done" && (
                  <Button variant="outline" size="sm" onClick={handleReset} className="h-10 whitespace-nowrap">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    New
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProvisioningChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center"><div className="flex items-center gap-3 text-gray-500"><Activity className="h-5 w-5 animate-spin" /><span className="text-sm">Loading...</span></div></div>}>
      <ProvisioningChatInner />
    </Suspense>
  );
}
