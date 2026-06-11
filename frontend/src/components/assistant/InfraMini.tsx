"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader, Sparkles, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/api";
import { useCreditsStore } from "@/store/creditsStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useSettingsStore } from "@/store/settingsStore";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function getStoredUserName(): string {
  if (typeof window === "undefined") return "User";
  return localStorage.getItem("user_name") || "User";
}

function stripMarkdown(text: string): string {
  if (!text) return text;
  let out = text;
  out = out.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
  out = out.replace(/^#{1,6}\s+/gm, "");
  out = out.replace(/[\u2600-\u27BF\u2700-\u27BF\uFE00-\uFE0F\u2000-\u206F\u2300-\u23FF\u2190-\u21FF]/g, "");
  out = out.replace(/^[\s]*[-*•]\s+/gm, "");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

export function InfraMini() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { remaining } = useCreditsStore();
  const { general } = useSettingsStore();
  const userName = getStoredUserName();
  const agentName = "InfraMini";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { id: `m-${Date.now()}`, role, content, timestamp: new Date() }]);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev && !hasGreeted) {
        setHasGreeted(true);
        setTimeout(() => {
          addMessage("assistant", `Hi ${userName}, I'm ${agentName}. I can help with your ${general.portalName} infrastructure.`);
        }, 300);
      }
      return !prev;
    });
  }, [hasGreeted, userName, agentName, general.portalName, addMessage]);

  const handleSend = async () => {
    if (!input.trim() || loading || remaining <= 0) return;
    const userMsg = input.trim();
    setInput("");
    addMessage("user", userMsg);
    setLoading(true);

    const onboarding = useOnboardingStore.getState();
    const tenantContext: Record<string, unknown> = {};
    const tid = onboarding.onboardingData?.tenantId;
    if (tid) tenantContext.tenant_id = tid;
    const sid = onboarding.onboardingData?.subscriptionId;
    if (sid) tenantContext.subscription_id = sid;

    let lastError = "";
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const data: any = await apiService.inframiniChat(userMsg, userName, tenantContext);
        if (data?.success && data?.response) {
          addMessage("assistant", stripMarkdown(data.response));
          if (data.credits_used > 0) {
            useCreditsStore.getState().deduct();
          }
          setLoading(false);
          return;
        }
        lastError = data?.response || "No response from AI";
      } catch (err: any) {
        lastError = err?.name === "AbortError" ? "Request timed out" : (err?.message || "Connection error");
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    addMessage("assistant", `Sorry, I couldn't process that. ${lastError}. Please try again or check your AI configuration.`);
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          isOpen ? "bg-red-500 hover:bg-red-600" : "bg-azure-500 hover:bg-azure-600"
        )}
      >
        {isOpen ? <X className="h-6 w-6 text-white" /> : <Sparkles className="h-6 w-6 text-white" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "560px", borderRadius: "20px" }}
          >
            <div className="flex items-center justify-between px-5 py-3.5 bg-azure-500 text-white">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-sm">{agentName}</span>
                  <p className="text-[10px] text-white/70 leading-none mt-0.5">AI Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-white/20 rounded-md px-2 py-0.5 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {remaining}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center px-4">
                    <div className="h-10 w-10 bg-azure-100 dark:bg-azure-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Bot className="h-5 w-5 text-azure-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ask me anything
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Deployments, costs, resources, and more
                    </p>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-azure-500 text-white rounded-[18px] rounded-br-[6px]"
                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-[18px] rounded-bl-[6px]"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[18px] rounded-bl-[6px] px-3.5 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                </div>
              )}
              {remaining <= 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  No credits remaining
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Ask ${agentName}...`}
                  disabled={loading || remaining <= 0}
                  className="flex-1 px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 placeholder:text-gray-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading || remaining <= 0}
                  className="h-9 w-9 bg-azure-500 text-white rounded-xl flex items-center justify-center hover:bg-azure-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
