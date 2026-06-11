"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, User, CheckCircle, Cloud, Server, Database, Layers, Network, Activity, AlertTriangle, RefreshCw, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { AnimatedChatInput } from "@/components/assistant/AnimatedChatInput";
import { apiService } from "@/services/api";
import { useNotificationStore } from "@/store/notificationStore";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  events?: ActivityEvent[];
  plan?: any;
  result?: any;
}

interface ActivityEvent {
  type: string;
  icon?: string;
  title: string;
  status: string;
  message?: string;
}

type ChatPhase = "idle" | "processing" | "approval" | "deploying" | "done" | "error";

const ERROR_TYPES: Record<string, string> = {
  "Authentication failed": "Azure Authentication Failed",
  "Authorization failed": "Insufficient Permissions",
  "SubscriptionNotFound": "Subscription Not Found",
  "ResourceGroupNotFound": "Resource Group Not Found",
  "timeout": "Azure SDK Timeout",
  "connect": "Network Connectivity Failure",
};

function classifyError(err: any): string {
  const msg = (err?.message || err?.detail || String(err || "")).toLowerCase();
  for (const [key, label] of Object.entries(ERROR_TYPES)) {
    if (msg.includes(key.toLowerCase())) return label;
  }
  if (msg.includes("fetch")) return "Network Connectivity Failure";
  if (msg.includes("500") || msg.includes("internal")) return "Backend Error";
  return err?.message || err?.detail || "Deployment failed";
}

function ProvisioningChatInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [plan, setPlan] = useState<any>(null);
  const [deploying, setDeploying] = useState(false);

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

    addMessage({ id: `user-${Date.now()}`, role: "user", content, timestamp: new Date() });
    setInputValue("");
    setIsLoading(true);

    try {
      const res: any = await apiService.provisioningAgentChat(sessionId, content);
      const events: ActivityEvent[] = (res?.events || []).filter((e: any) => e.type === "activity");

      if (res?.session_id) setSessionId(res.session_id);
      if (res?.plan) setPlan(res.plan);

      if (res?.phase === "approval") {
        setPhase("approval");
        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.message || "## Deployment Plan Generated\n\nReview and approve the deployment plan.",
          timestamp: new Date(),
          events,
          plan: res.plan,
        });
      } else if (res?.phase === "done") {
        setPhase("done");
        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.message || "## ✅ Deployment Complete",
          timestamp: new Date(),
          events,
          result: { deployment_id: res.deployment_id, request_id: res.request_id },
        });
        if (res.deployment_id) {
          addNotification({ title: "Deployment complete", message: `Deployment ${res.deployment_id} succeeded`, status: "success", category: "tenant_sync" as any });
        }
      } else if (res?.phase === "error") {
        setPhase("error");
        addMessage({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `## ❌ ${res.message || "Deployment failed"}`,
          timestamp: new Date(),
          events,
        });
      } else if (res?.phase === "deploying") {
        setPhase("deploying");
        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.message || "## Deploying...",
          timestamp: new Date(),
          events,
        });
      } else {
        setPhase("processing");
        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.message || "Processing your request...",
          timestamp: new Date(),
          events,
        });
      }
    } catch (e: any) {
      const errorLabel = classifyError(e);
      addMessage({
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `## ❌ ${errorLabel}\n\n${e?.message || "An unexpected error occurred. Please try again."}`,
        timestamp: new Date(),
        events: [{ type: "activity", icon: "AlertTriangle", title: errorLabel, status: "error" }],
      });
      setPhase("error");
    }

    setIsLoading(false);
    isSubmitting.current = false;
  }, [sessionId, isLoading, messages]);

  const handleApprove = async () => {
    if (!sessionId) return;
    setDeploying(true);
    try {
      const res: any = await apiService.approveDeployment(sessionId);
      const events: ActivityEvent[] = (res?.events || []).filter((e: any) => e.type === "activity");

      if (res?.phase === "done") {
        setPhase("done");
        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.message || "## ✅ Deployment Complete",
          timestamp: new Date(),
          events,
          result: { deployment_id: res.deployment_id, request_id: res.request_id },
        });
        addNotification({ title: "Deployment complete", message: `Deployment succeeded`, status: "success", category: "tenant_sync" as any });
      } else {
        setPhase("deploying");
        addMessage({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.message || "## Deployment in progress...",
          timestamp: new Date(),
          events,
        });
      }
    } catch (e: any) {
      addMessage({
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `## ❌ Deployment Failed\n\n${e?.message || "Failed to execute deployment"}`,
        timestamp: new Date(),
      });
      setPhase("error");
    }
    setDeploying(false);
  };

  const handleReject = async () => {
    if (!sessionId) return;
    try {
      await apiService.rejectDeployment(sessionId);
    } catch {}
    setPhase("idle");
    setPlan(null);
    addMessage({
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "Deployment cancelled. Feel free to ask when you're ready to deploy something else.",
      timestamp: new Date(),
    });
  };

  const handleReset = () => {
    setPhase("idle");
    setSessionId(null);
    setPlan(null);
  };

  const placeholderTexts = [
    "Create a Resource Group in Central India...",
    "Deploy a Storage Account...",
    "Provision a Virtual Machine...",
    "Set up a Virtual Network...",
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator />

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
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Cloud Infrastructure Engineer</h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    AI Infrastructure Engineer
                    {phase !== "idle" && (
                      <span className="ml-2 text-azure-500 font-medium">
                        {" "}&middot;{" "}
                        {phase === "processing" ? "Processing" :
                         phase === "approval" ? "Awaiting Approval" :
                         phase === "deploying" ? "Deploying" :
                         phase === "done" ? "Complete" :
                         phase === "error" ? "Failed" : "Idle"}
                      </span>
                    )}
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
                        {msg.plan ? (
                          <div className="space-y-2">
                            <div className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl overflow-hidden">
                              <div className="bg-emerald-600 dark:bg-emerald-800 px-4 py-3">
                                <h3 className="text-sm font-semibold text-white">Deployment Plan</h3>
                              </div>
                              <div className="p-4">
                                <div className="text-sm whitespace-pre-wrap text-gray-900 dark:text-white" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code class='bg-gray-100 dark:bg-slate-900 px-1 rounded text-xs font-mono'>$1</code>") }} />
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
                                  <Button onClick={handleApprove} disabled={deploying} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-sm font-semibold">
                                    {deploying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                    Approve & Deploy
                                  </Button>
                                  <Button onClick={handleReject} disabled={deploying} variant="outline" className="flex-1 h-10 text-sm font-semibold text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-slate-500">
                              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        ) : (
                          <div className={cn(
                            "rounded-2xl px-4 py-3",
                            msg.role === "user"
                              ? "bg-azure-500 text-white rounded-br-md"
                              : "bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-bl-md"
                          )}>
                            <div className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/```hcl\n?([\s\S]*?)```/g, "<pre class='bg-gray-100 dark:bg-slate-900 rounded p-2 my-2 text-xs overflow-x-auto font-mono'>$1</pre>").replace(/```\n?([\s\S]*?)```/g, "<pre class='bg-gray-100 dark:bg-slate-900 rounded p-2 my-2 text-xs overflow-x-auto font-mono'>$1</pre>").replace(/`([^`]+)`/g, "<code class='bg-gray-100 dark:bg-slate-900 px-1 rounded text-xs font-mono'>$1</code>") }} />
                            <p className="text-xs mt-1 opacity-70">
                              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        )}
                        {msg.events && msg.events.length > 0 && !msg.plan && (
                          <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl p-3 space-y-2">
                            {msg.events.map((evt, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                {evt.status === "completed" ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                ) : evt.status === "error" ? (
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                ) : evt.status === "in_progress" ? (
                                  <Loader2 className="h-3.5 w-3.5 text-azure-500 animate-spin flex-shrink-0" />
                                ) : (
                                  <Activity className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                )}
                                <span className="text-gray-700 dark:text-slate-300">{evt.title}</span>
                                {evt.message && <span className="text-gray-400 dark:text-slate-500">- {evt.message}</span>}
                              </div>
                            ))}
                          </div>
                        )}
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
                    disabled={isLoading || phase === "deploying"}
                  />
                </div>
                {(phase === "done" || phase === "error") && (
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
