"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg?: string;
}

export function QuickActionCard({ title, description, icon, iconBg = "bg-gray-50 dark:bg-slate-700/50" }: QuickActionCardProps) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = () => {
    setIsNavigating(true);
    // Simulate navigation - pages not created yet
    setTimeout(() => {
      setIsNavigating(false);
    }, 1500);
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="h-full"
    >
      <div className="flex flex-col h-full p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm transition-all">
        {/* Icon with colored background */}
        <div className={cn("p-2.5 rounded-lg w-fit mb-3", iconBg)}>
          {icon}
        </div>
        
        {/* Title and subtitle */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {title}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        
        {/* Get Started CTA */}
        <button
          onClick={handleClick}
          disabled={isNavigating}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 transition-colors"
        >
          {isNavigating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Navigating...
            </>
          ) : (
            <>
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
