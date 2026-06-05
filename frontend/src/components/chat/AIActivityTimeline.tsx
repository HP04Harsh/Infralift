"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader, XCircle, Search, Zap, MessageSquare, ClipboardList, Cloud, FileText, Database, Layers, Network, Box, AlertTriangle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityEvent {
  type: string;
  icon?: string;
  title?: string;
  status?: string;
  content?: string;
  message?: string;
  data?: Record<string, unknown>;
}

interface AIActivityTimelineProps {
  events: ActivityEvent[];
  isStreaming?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare className="h-4 w-4" />,
  Search: <Search className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  CheckCircle: <CheckCircle className="h-4 w-4" />,
  ClipboardList: <ClipboardList className="h-4 w-4" />,
  Cloud: <Cloud className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
  Database: <Database className="h-4 w-4" />,
  Layers: <Layers className="h-4 w-4" />,
  Network: <Network className="h-4 w-4" />,
  Box: <Box className="h-4 w-4" />,
  AlertTriangle: <AlertTriangle className="h-4 w-4" />,
  Bot: <Bot className="h-4 w-4" />,
};

export function AIActivityTimeline({ events, isStreaming }: AIActivityTimelineProps) {
  const activities = events.filter(e => e.type === "activity");
  const contentEvents = events.filter(e => e.type === "content");

  if (activities.length === 0 && contentEvents.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="h-4 w-4 text-azure-500" />
        <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
          AI Activity
        </span>
        {isStreaming && (
          <span className="flex items-center gap-1 text-xs text-azure-500">
            <span className="w-1.5 h-1.5 bg-azure-500 rounded-full animate-pulse" />
            Processing...
          </span>
        )}
      </div>

      <div className="space-y-1">
        <AnimatePresence>
          {activities.map((event, i) => {
            const isLast = i === activities.length - 1;
            const status = event.status || "in_progress";
            const isError = status === "error";
            const isCompleted = status === "completed";
            const isInProgress = status === "in_progress";

            return (
              <motion.div
                key={`activity-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="flex items-start gap-3 py-1.5"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                    isError ? "bg-red-100 dark:bg-red-900/30" :
                    isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30" :
                    "bg-blue-100 dark:bg-blue-900/30"
                  )}>
                    {isError ? (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    ) : isCompleted ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <div className="relative">
                        <div className={cn(
                          "h-3.5 w-3.5 text-blue-500",
                          event.icon ? "" : ""
                        )}>
                          {event.icon && iconMap[event.icon] ? iconMap[event.icon] : <Loader className="h-3.5 w-3.5 animate-spin" />}
                        </div>
                      </div>
                    )}
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 h-6 mt-1",
                      isError ? "bg-red-200 dark:bg-red-800" :
                      isCompleted ? "bg-emerald-200 dark:bg-emerald-800" :
                      "bg-blue-200 dark:bg-blue-800"
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={cn(
                    "text-sm font-medium",
                    isError ? "text-red-600 dark:text-red-400" :
                    isCompleted ? "text-gray-900 dark:text-white" :
                    "text-blue-600 dark:text-blue-400"
                  )}>
                    {event.title || "Processing..."}
                  </p>
                  {event.message && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{event.message}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Streaming content */}
      {contentEvents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
            {contentEvents.map(e => e.content || "").join("")}
            {isStreaming && <span className="inline-block w-1.5 h-4 bg-azure-500 animate-pulse ml-0.5" />}
          </p>
        </div>
      )}
    </div>
  );
}
