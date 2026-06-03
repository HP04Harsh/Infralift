"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, ArrowLeft, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedInput } from "@/components/ui/animated-input";
import { InstagramBorder } from "@/components/ui/instagram-border";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentChatProps {
  agentName: string;
  agentType: string;
  initialPrompt?: string;
}

const agentResponses: Record<string, (prompt: string) => string> = {
  provisioning: (p) => `I'll help you provision the requested resources. Based on your request "${p}", I recommend starting with a standard VM series in the East US region. Would you like me to proceed with the default configuration?`,
  assessment: (p) => `Let me analyze your Azure environment for "${p}". Currently scanning 156 resources across 12 resource groups. I'll provide a comprehensive assessment report with cost optimization and security recommendations.`,
  migration: (p) => `For your migration request "${p}", I've identified the workloads that need to be migrated. The assessment shows 3 VMs, 2 databases, and 5 storage accounts are ready for migration. Recommended approach: lift-and-shift with minimal refactoring.`,
  observability: (p) => `Analyzing your observability data for "${p}". Current metrics show 99.8% uptime across all services, average response time of 45ms, and 0.3% error rate. No anomalies detected in the last 24 hours.`,
  optimization: (p) => `Optimizing your infrastructure based on "${p}". I've identified potential cost savings of 23% by right-sizing 8 VMs and 15% by moving 3 storage accounts to cooler tiers. Would you like a detailed breakdown?`,
  troubleshoot: (p) => `Troubleshooting "${p}". Analyzing recent logs and metrics... I've found 2 related incidents in the last hour. The most likely cause is a configuration drift in the network security group. Let me suggest a fix.`,
  itsm: (p) => `Creating an ITSM ticket for "${p}". I've categorized this as a service request with medium priority. The estimated resolution time is 4 hours. Would you like me to escalate if not resolved within the SLA window?`,
  compliance: (p) => `Running compliance scan for "${p}". Checking against Azure Policy and industry standards (SOC 2, ISO 27001). Found 3 non-compliant resources: 2 storage accounts without encryption and 1 VM without backup configured.`,
  dashboard: (p) => `Here's your dashboard overview for "${p}". All systems operational. Key metrics: 156 resources managed, 99.9% uptime, 0.3% error rate, 24 active alerts. Ready to help with any specific queries.`,
};

export function AgentChat({ agentName, agentType, initialPrompt = "" }: AgentChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialPromptSent = useRef(false);

  // Load chat history from localStorage (simulating Redis persistence)
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_${agentType}`);
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      setMessages(parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
    }
  }, [agentType]);

  // Save chat history to localStorage (simulating Redis persistence)
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${agentType}`, JSON.stringify(messages));
    }
  }, [messages, agentType]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle initial prompt (only once, prevents double-send in Strict Mode)
  useEffect(() => {
    if (initialPrompt && !initialPromptSent.current) {
      initialPromptSent.current = true;
      handleSend(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Agent-specific response
    const responder = agentResponses[agentType] || ((p: string) => `I understand you want to ${p}. Let me help you with that...`);
    const responseContent = responder(content);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const placeholderTexts = [
    `Ask ${agentName} anything...`,
    `How can I help you today?`,
    `What would you like to know?`,
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator userName="Harsh Pardhi" />
        
        <main className="h-[calc(100vh-56px)] flex flex-col">
          {/* Chat Header */}
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
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {agentType} Agent
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
            <div className="max-w-4xl mx-auto space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="h-8 w-8 bg-azure-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-azure-500 text-white rounded-br-md"
                          : "bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {message.role === "user" && (
                      <div className="h-8 w-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
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

          {/* Input Area */}
          <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 px-4 lg:px-6 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500 z-20" />
                <InstagramBorder>
                  <AnimatedInput
                    placeholderTexts={placeholderTexts}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full h-12 pl-12 pr-24"
                  />
                </InstagramBorder>
                <Button
                  size="sm"
                  onClick={() => handleSend(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full bg-azure-500 hover:bg-azure-600 transition-colors z-20"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
