"use client";

import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

interface AgentLayoutProps {
  children: ReactNode;
  userName?: string;
  showLiveIndicator?: boolean;
}

export function AgentLayout({ children, userName: propUserName = "User", showLiveIndicator = true }: AgentLayoutProps) {
  const [userName, setUserName] = useState(propUserName);

  useEffect(() => {
    const update = () => {
      const stored = localStorage.getItem('user_name');
      if (stored) setUserName(stored);
    };
    update();
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator={showLiveIndicator} userName={userName} />
        
        <main className="p-4 lg:p-5">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}