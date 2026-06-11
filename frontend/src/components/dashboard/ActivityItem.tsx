"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItemProps {
  title: string;
  status: "Completed" | "Resolved" | "Updated" | "Open" | "In Progress";
  timestamp: string;
  onClick?: () => void;
}

export function ActivityItem({ title, status, timestamp, onClick }: ActivityItemProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "Completed":
        return {
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
          textColor: "text-emerald-700 dark:text-emerald-400",
          borderColor: "border-emerald-200 dark:border-emerald-800",
        };
      case "Resolved":
        return {
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          bgColor: "bg-blue-50 dark:bg-blue-900/30",
          textColor: "text-blue-700 dark:text-blue-400",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      case "Updated":
        return {
          icon: <Clock className="h-3.5 w-3.5" />,
          bgColor: "bg-amber-50 dark:bg-amber-900/30",
          textColor: "text-amber-700 dark:text-amber-400",
          borderColor: "border-amber-200 dark:border-amber-800",
        };
      case "Open":
        return {
          icon: <FileText className="h-3.5 w-3.5" />,
          bgColor: "bg-purple-50 dark:bg-purple-900/30",
          textColor: "text-purple-700 dark:text-purple-400",
          borderColor: "border-purple-200 dark:border-purple-800",
        };
      case "In Progress":
        return {
          icon: <Clock className="h-3.5 w-3.5 animate-spin" />,
          bgColor: "bg-blue-50 dark:bg-blue-900/30",
          textColor: "text-blue-700 dark:text-blue-400",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      default:
        return {
          icon: <Clock className="h-3.5 w-3.5" />,
          bgColor: "bg-gray-50 dark:bg-gray-900/30",
          textColor: "text-gray-700 dark:text-gray-400",
          borderColor: "border-gray-200 dark:border-gray-800",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all",
        onClick ? "cursor-pointer hover:border-gray-300 dark:hover:border-slate-600" : "hover:border-gray-200 dark:hover:border-slate-700"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-full flex-shrink-0",
        statusConfig.bgColor,
        statusConfig.textColor
      )}>
        {statusConfig.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-900 dark:text-white mb-1 truncate">
          {title}
        </p>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border",
            statusConfig.bgColor,
            statusConfig.textColor,
            statusConfig.borderColor
          )}>
            {status}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-slate-400">
            {timestamp}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
