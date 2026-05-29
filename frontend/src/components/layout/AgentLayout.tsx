"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

interface AgentLayoutProps {
  children: ReactNode;
  userName?: string;
  showLiveIndicator?: boolean;
}

export function AgentLayout({ children, userName = "Harsh Pardhi", showLiveIndicator = true }: AgentLayoutProps) {
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