"use client";

import { User, Bell, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";

interface HeaderProps {
  title?: string;
  userName?: string;
  showLiveIndicator?: boolean;
}

export function Header({ title = "Dashboard", userName = "Harsh Pardhi", showLiveIndicator = false }: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Live indicator and Region */}
      <div className="flex items-center gap-4">
        {showLiveIndicator && <LiveIndicator />}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500 dark:text-slate-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Region: Central India 🇮🇳
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
