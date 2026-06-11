"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, User, CheckCircle, Loader, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { useRouter } from "next/navigation";
import { AnimatedChatInput } from "@/components/assistant/AnimatedChatInput";
import { AIActivityTimeline } from "@/components/chat/AIActivityTimeline";
import { apiService } from "@/services/api";
import { useSettingsStore } from "@/store/settingsStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  events?: any[];
}

interface AgentChatProps {
  agentName: string;
  agentType: string;
  initialPrompt?: string;
}

export function AgentChat({ agentName, agentType, initialPrompt = "" }: AgentChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<'idle' | 'connected' | 'unavailable'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const effectRan = useRef(false);
  const isSubmitting = useRef(false);
  const [hasAnyProvider, setHasAnyProvider] = useState(true);

  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_${agentType}`);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch { /* ignore corrupt data */ }
    }
  }, [agentType]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${agentType}`, JSON.stringify(messages));
    }
  }, [messages, agentType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (effectRan.current) return;
    effectRan.current = true;
    if (initialPrompt) {
      setTimeout(() => handleSend(initialPrompt), 300);
    }
  }, [initialPrompt]);

  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || isSubmitting.current) return;
    isSubmitting.current = true;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      let responseText = "";

      const agentSettings = useSettingsStore.getState().agents[agentType as keyof ReturnType<typeof useSettingsStore.getState>['agents']];
      const hasAzureCreds = agentSettings && Boolean((agentSettings as any).azureEndpoint && (agentSettings as any).openaiApiKey);

      const res: any = await apiService.aiChat({
        message: content,
        agent_type: agentType,
        conversation_context: {
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
        ...(hasAzureCreds ? {
          azure_endpoint: (agentSettings as any).azureEndpoint,
          azure_key: (agentSettings as any).openaiApiKey,
          azure_deployment: (agentSettings as any).model,
          azure_api_version: (agentSettings as any).apiVersion || "2024-02-15-preview",
        } : {}),
      });

      responseText = res?.full_response || "";

      if (responseText) {
        setProviderStatus('connected');
      } else {
        setProviderStatus('unavailable');
        responseText = "No AI provider is currently configured.\n\nConfigure Azure OpenAI or HuggingFace from **Settings → Agent Settings** to enable AI features.";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMsg = error?.message || "";
      const isProviderError = errorMsg.toLowerCase().includes("provider") || errorMsg.toLowerCase().includes("not configured");
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: isProviderError
          ? "No AI provider is currently configured.\n\nConfigure Azure OpenAI or HuggingFace from **Settings → Agent Settings** to enable AI features."
          : `**Error:** ${errorMsg}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  }, [agentType, isLoading, messages]);

  const placeholderTexts = [
    `Ask ${agentName} anything...`,
    `How can I help you today?`,
    `What would you like to know?`,
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />

      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator />

        <main className="h-[calc(100vh-56px)] flex flex-col">
          <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 lg:px-6 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-azure-500 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {agentName}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
                    {agentType} Agent
                    {providerStatus === 'connected' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                        AI Connected
                      </span>
                    ) : providerStatus === 'unavailable' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Not Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">Checking...</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Bot className="h-12 w-12 text-azure-400 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{agentName}</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                    Ask about migration scenarios, get help planning your Azure migration, or start a guided migration workflow.
                  </p>
                </div>
              )}
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" && (
                        <div className="h-8 w-8 bg-azure-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="max-w-[80%] space-y-2">
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.role === "user"
                              ? "bg-azure-500 text-white rounded-br-md"
                              : "bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-bl-md"
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{
                            __html: message.content
                              .replace(/\n/g, "<br/>")
                              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                              .replace(/`([^`]+)`/g, "<code class='bg-gray-100 dark:bg-slate-900 px-1 rounded text-xs font-mono'>$1</code>")
                          }} />
                          <p className="text-xs mt-1 opacity-70">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="h-8 w-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="h-8 w-8 bg-azure-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="space-y-2">
                      <AIActivityTimeline
                        events={[
                          { type: "activity", icon: "MessageSquare", title: "Processing your request...", status: "in_progress" },
                        ]}
                        isStreaming={true}
                      />
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 px-4 lg:px-6 py-4">
            <div className="max-w-4xl mx-auto">
              <AnimatedChatInput
                value={inputValue}
                onChange={(v) => setInputValue(v)}
                onSubmit={() => handleSend(inputValue)}
                placeholderTexts={placeholderTexts}
                disabled={isLoading}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
