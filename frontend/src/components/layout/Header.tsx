"use client";

import { useState, useEffect } from "react";
import { User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  userName?: string;
  showLiveIndicator?: boolean;
}

export function Header({ userName = "Harsh Pardhi", showLiveIndicator = true }: HeaderProps) {
  const [activeTime, setActiveTime] = useState("00h 00m");

  // Calculate active time from session start
  useEffect(() => {
    const sessionStart = localStorage.getItem('sessionStartTime') || Date.now().toString();
    const updateTime = () => {
      const now = Date.now();
      const diff = now - parseInt(sessionStart);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setActiveTime(`${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Portal status and Region */}
      <div className="flex items-center gap-4">
        {showLiveIndicator && (
          <div className="flex items-center gap-2">
            {/* Small Neon Green Circle - Subtle Glow */}
            <div className="relative flex items-center">
              <div
                className="w-2 h-2 rounded-full bg-emerald-500"
                style={{
                  boxShadow: "0 0 6px 1px rgba(34, 197, 94, 0.6), 0 0 10px 2px rgba(34, 197, 94, 0.3)",
                }}
              />
            </div>
            
            {/* Portal Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Portal Live = Active
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">|</span>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Active Time - {activeTime}
              </span>
            </div>
          </div>
        )}
        
        {/* Region */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            🇮🇳 Region: Central India
          </span>
        </div>
      </div>

      {/* Right side - Notification, theme toggle, user profile */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-azure-500 rounded-full"></span>
        </button>
        <ThemeToggle />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-azure-500 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 hidden sm:block">{userName}</span>
        </div>
      </div>
    </header>
  );
}
