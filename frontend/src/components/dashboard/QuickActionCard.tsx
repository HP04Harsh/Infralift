"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function QuickActionCard({ title, description, icon }: QuickActionCardProps) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left"
    >
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all">
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white mb-0.5 truncate">
            {title}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
            {description}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
      </div>
    </motion.button>
  );
}
