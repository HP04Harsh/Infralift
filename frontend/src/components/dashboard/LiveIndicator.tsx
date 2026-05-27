"use client";

import { cn } from "@/lib/utils";

export function LiveIndicator() {
  // Calculate active time (simple implementation)
  const activeTime = "2h 34m"; // This would be calculated from actual uptime

  return (
    <div className="flex items-center gap-2">
      {/* Small Neon Green Circle - No Blinking */}
      <div className="relative flex items-center">
        {/* Static neon glow */}
        <div
          className="w-2.5 h-2.5 rounded-full bg-emerald-500"
          style={{
            boxShadow: "0 0 8px 2px rgba(34, 197, 94, 0.8), 0 0 12px 4px rgba(34, 197, 94, 0.4)",
          }}
        />
      </div>
      
      {/* Active Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Active
        </span>
        <span className="text-xs text-gray-400 dark:text-slate-500">|</span>
        <span className="text-xs text-gray-500 dark:text-slate-400">
          Active Time - {activeTime}
        </span>
      </div>
    </div>
  );
}
