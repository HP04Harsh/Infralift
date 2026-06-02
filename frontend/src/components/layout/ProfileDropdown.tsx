"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProfileDropdownProps {
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDropdown({ userName, isOpen, onClose }: ProfileDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSignOut = () => {
    // Clear auth session and redirect to landing page
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_session');
    router.push('/landing');
    onClose();
  };

  const handleSettings = () => {
    router.push('/settings');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Dropdown */}
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-4 top-14 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 z-50 overflow-hidden"
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-gray-200/50 dark:border-slate-700/50 bg-gradient-to-r from-azure-50/50 to-purple-50/50 dark:from-azure-900/20 dark:to-purple-900/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-azure-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 truncate">
                    Administrator
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2 space-y-1">
              <button
                onClick={handleSettings}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 group"
              >
                <Settings className="h-4 w-4 text-gray-500 dark:text-slate-400 group-hover:text-azure-500 dark:group-hover:text-azure-400 transition-colors" />
                <span className="font-medium">Settings</span>
              </button>

              <div className="h-px bg-gray-200 dark:bg-slate-700 my-1" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 group shadow-lg shadow-red-500/20"
              >
                <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}