"use client";

import { useState, useEffect } from "react";
import { User, Bell, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUptimeStore } from "@/store/uptimeStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { NotificationDrawer } from "./NotificationDrawer";
import { ProfileDropdown } from "./ProfileDropdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PortalStatusDrawer } from "./PortalStatusDrawer";
import { SetupGuideDrawer } from "./SetupGuideDrawer";
import { useTenantDataStore } from "@/store/tenantDataStore";

interface HeaderProps {
  userName?: string;
  showLiveIndicator?: boolean;
}

export function Header({ userName = "Harsh Pardhi", showLiveIndicator = true }: HeaderProps) {
  const [uptime, setUptime] = useState("00h 00m");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPortalStatus, setShowPortalStatus] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { getUptime, isHealthy } = useUptimeStore();
  const { getUnreadCount } = useNotificationStore();
  const { general, customization } = useSettingsStore();
  const unreadCount = getUnreadCount();
  const resync = useTenantDataStore((s) => s.resync);
  const lastSync = useTenantDataStore((s) => s.lastSync);
  
  // Get user role from localStorage
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;

  useEffect(() => {
    setUptime(getUptime());
    const interval = setInterval(() => {
      setUptime(getUptime());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [getUptime]);

  return (
    <header className="h-14 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Portal status and Region */}
      <div className="flex items-center gap-4">
        {showLiveIndicator && (
          <div className="flex items-center gap-2">
            {/* Clickable Portal Status */}
            <button
              onClick={() => setShowPortalStatus(true)}
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg px-2 py-1 transition-colors"
            >
              <div className="relative flex items-center">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isHealthy ? "bg-emerald-500" : "bg-red-500"
                  )}
                  style={{
                    boxShadow: isHealthy 
                      ? "0 0 4px 1px rgba(34, 197, 94, 0.4)" 
                      : "0 0 4px 1px rgba(239, 68, 68, 0.4)",
                  }}
                />
              </div>
              
              <span className={cn(
                "text-xs font-medium",
                isHealthy ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                Portal Active
              </span>
            </button>
            <span className="text-xs text-gray-400 dark:text-slate-500">|</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Active Time - {uptime}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">|</span>
            <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
              Region: Central India
              <img 
                src="/images/indian-flag.png" 
                alt="India" 
                className="w-4 h-3 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const span = document.createElement('span');
                  span.textContent = '🇮🇳';
                  e.currentTarget.parentElement?.appendChild(span);
                }}
              />
              {userRole === 'reader' && (
                <span className="text-azure-600 dark:text-azure-400 font-medium">
                  — Reader
                </span>
              )}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">|</span>
            <button
              onClick={async () => {
                setSyncing(true);
                await resync();
                setSyncing(false);
              }}
              disabled={syncing}
              className="p-1 text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-1 disabled:opacity-50"
              title={syncing ? "Syncing..." : "Resync all tenant data"}
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
              <span className="text-[10px] font-medium">{syncing ? "Syncing..." : "Resync"}</span>
            </button>
            {lastSync && !syncing && (
              <span className="text-[9px] text-gray-500 dark:text-slate-500" title={lastSync}>
                Synced
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side - Theme toggle, Notification, user profile */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button 
          onClick={() => setShowNotifications(true)}
          className="relative p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-azure-500 rounded-full animate-pulse" />
          )}
        </button>
        <button 
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg px-2 py-1 transition-colors"
        >
          <div className="w-8 h-8 bg-azure-500 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 hidden sm:block">{userName}</span>
        </button>
      </div>

      {/* Notification Drawer */}
      <NotificationDrawer isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      
      {/* Portal Status Drawer */}
      <PortalStatusDrawer isOpen={showPortalStatus} onClose={() => setShowPortalStatus(false)} />

      {/* Setup Guide Drawer */}
      <SetupGuideDrawer isOpen={showSetupGuide} onClose={() => setShowSetupGuide(false)} />
      
      {/* Profile Dropdown */}
      <ProfileDropdown userName={userName} isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </header>
  );
}
