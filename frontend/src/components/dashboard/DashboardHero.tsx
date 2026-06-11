"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { RGBText } from "@/components/ui/rgb-text";
import { AnimatedGradientChatInput } from "@/components/assistant/AnimatedGradientChatInput";

interface DashboardHeroProps {
  userName?: string;
}

export function DashboardHero({ userName: propUserName = "User" }: DashboardHeroProps) {
  const [userName, setUserName] = useState(propUserName);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const update = () => {
      const stored = localStorage.getItem('user_name');
      if (stored) setUserName(stored);
    };
    update();
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

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
        greetingText = `Good morning,`;
      } else if (hours >= 12 && hours < 17) {
        greetingText = `Good afternoon,`;
      } else if (hours >= 17 && hours < 24) {
        greetingText = `Good evening,`;
      } else {
        greetingText = `Working late,`;
      }
      
      setGreeting(greetingText);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

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

  const placeholderTexts = [
    "Ask anything about your infrastructure...",
    "How can I help you today?",
    "What would you like to build?",
  ];

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
            {greeting} <RGBText>{userName}</RGBText> 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm text-gray-500 dark:text-slate-400"
          >
            How can I help you build, manage and optimize your infrastructure today?
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

        {/* AI Input Box with Animated Gradient Border */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <AnimatedGradientChatInput
            simple
            quickActions={quickActions}
            placeholderVariants={placeholderTexts}
            agentType="dashboard"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
