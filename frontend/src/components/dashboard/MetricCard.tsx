"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  subtext?: string;
  variant?: "default" | "warning" | "success";
  icon: React.ReactNode;
  iconBg?: string;
}

export function MetricCard({
  title,
  value,
  trend,
  subtext,
  variant = "default",
  icon,
  iconBg = "bg-gray-50 dark:bg-slate-700/50",
}: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                {title}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
            </div>
            <div className={cn(
              "p-2 rounded-lg flex-shrink-0 ml-2",
              iconBg
            )}>
              {icon}
            </div>
          </div>
          
          {(trend || subtext) && (
            <p className={cn(
              "text-xs",
              variant === "warning" && "text-amber-600 dark:text-amber-400",
              variant === "success" && "text-emerald-600 dark:text-emerald-400",
              variant === "default" && "text-gray-500 dark:text-slate-400"
            )}>
              {trend || subtext}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
