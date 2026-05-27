"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  userName?: string;
}

export function DashboardHero({ userName = "Harsh" }: DashboardHeroProps) {
  const [greeting, setGreeting] = useState("");
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic IST-based greeting
  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      // Get IST time (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
      const istTime = new Date(now.getTime() + istOffset);
      const hours = istTime.getUTCHours();
      
      let greetingText = "";
      if (hours >= 5 && hours < 12) {
        greetingText = `Good morning, ${userName} 👋`;
      } else if (hours >= 12 && hours < 17) {
        greetingText = `Good afternoon, ${userName} 👋`;
      } else if (hours >= 17 && hours < 24) {
        greetingText = `Good evening, ${userName} 👋`;
      } else {
        greetingText = `Working late, ${userName} 👋`;
      }
      
      setGreeting(greetingText);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [userName]);

  const quickActions = [
    {
      label: "Provision a VM in Azure",
      prompt: "I want to create a VM in [region-name] with [VM-size] for [workload-type]. Please recommend the best configuration and deployment steps.",
    },
    {
      label: "Show cost optimization opportunities",
      prompt: "Analyze my Azure tenant and show potential cost optimization opportunities across compute, storage, networking and unused resources.",
    },
    {
      label: "Check resource health",
      prompt: "Analyze resource health across my Azure infrastructure and identify unhealthy or high-risk resources.",
    },
    {
      label: "Create a change request",
      prompt: "I want to create a change request for [resource-name] affecting [service-name] during [maintenance-window].",
    },
  ];

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
    // Focus input and move cursor to end
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(prompt.length, prompt.length);
    }, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      {/* Hero Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 lg:p-8 shadow-sm">
        {/* Greeting Section */}
        <div className="text-center mb-5">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2"
          >
            {greeting}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm text-gray-500 dark:text-slate-400"
          >
            Your AI infrastructure assistant is ready to help
          </motion.p>
        </div>

        {/* Smart Assist Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-center mb-5"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-azure-50 dark:bg-azure-900/30 border border-azure-200 dark:border-azure-800 rounded-full">
            <Sparkles className="h-4 w-4 text-azure-500" />
            <span className="text-xs font-medium text-azure-700 dark:text-azure-400">
              Smart Assist
            </span>
          </div>
        </motion.div>

        {/* AI Input Box with Chat Icon */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-2xl mx-auto mb-5"
        >
          <div className="relative">
            <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500" />
            <Input
              ref={inputRef}
              placeholder="Ask anything about your infrastructure..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full h-12 pl-12 pr-24 rounded-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-azure-500 focus:border-transparent transition-all shadow-sm"
            />
            <Button
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full bg-azure-500 hover:bg-azure-600 transition-colors"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Quick Action Chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              onClick={() => handleQuickAction(action.prompt)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "px-4 py-2 text-xs font-medium rounded-full border transition-all",
                "bg-white dark:bg-slate-900",
                "border-gray-300 dark:border-slate-600",
                "text-gray-700 dark:text-slate-300",
                "hover:bg-gray-50 dark:hover:bg-slate-800",
                "hover:border-gray-400 dark:hover:border-slate-500",
                "hover:text-gray-900 dark:hover:text-white",
                "hover:shadow-sm"
              )}
            >
              {action.label}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
