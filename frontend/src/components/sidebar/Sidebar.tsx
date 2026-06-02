"use client";

import { Search, Settings, ChevronRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

const infrastructureAgents = [
  { name: "Provisioning Agent", path: "/provisioning" },
  { name: "Assessment Agent", path: "/assessment" },
  { name: "Migration Agent", path: "/migration" },
  { name: "Observability Agent", path: "/observability" },
  { name: "Optimization Agent", path: "/optimization" },
  { name: "Troubleshoot Agent", path: "/troubleshoot" },
  { name: "ITSM Agent", path: "/itsm" },
  { name: "Policy & Compliance Agent", path: "/compliance" },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const { general, customization } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);

  // Determine active agent based on current pathname
  const activeAgent = infrastructureAgents.find(agent => agent.path === pathname)?.name || "Provisioning Agent";

  const filteredAgents = infrastructureAgents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-azure-500 text-white rounded-lg shadow-lg hover:bg-azure-600 transition-colors"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "w-[240px] bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0 transition-transform transform z-50",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-gray-800">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2.5 mb-2 hover:opacity-80 transition-opacity cursor-pointer w-full text-left"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {customization.logoUrl ? (
                <img 
                  src={customization.logoUrl} 
                  alt={general.portalName} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-azure-500 font-bold text-base">I</span>';
                  }}
                />
              ) : (
                <img 
                  src="/images/infralift-logo.png" 
                  alt={general.portalName} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-azure-500 font-bold text-base">I</span>';
                  }}
                />
              )}
            </div>
            <h1 className="text-lg font-bold text-white">{general.portalName}</h1>
          </button>
          <p className="text-gray-400 text-[10px] mb-2 leading-tight">
            {general.organizationName}
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 bg-azure-600 text-white text-[10px] rounded-full font-medium">
              V1.1
            </span>
            <span className="inline-block px-2 py-0.5 bg-purple-600 text-white text-[10px] rounded-full font-medium shadow-lg shadow-purple-500/50">
              Beta
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 pb-5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-azure-500 focus:border-transparent text-white transition-all"
            />
          </div>
        </div>

        {/* Infrastructure Agents */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Infrastructure Agents
          </h2>
          <nav className="space-y-0.5">
            {filteredAgents.map((agent) => (
              <button
                key={agent.name}
                onClick={() => router.push(agent.path)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-all group",
                  activeAgent === agent.name
                    ? "bg-azure-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <span className="flex-1 text-left truncate">{agent.name}</span>
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform opacity-0 group-hover:opacity-100 flex-shrink-0",
                    activeAgent === agent.name && "opacity-100"
                  )}
                />
              </button>
            ))}
          </nav>
        </div>

        {/* Settings */}
        <div className="px-3 pb-2 border-t border-gray-800">
          <button 
            onClick={() => router.push('/settings')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
          >
            <Settings className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Settings</span>
          </button>
        </div>

        {/* Divider line */}
        <div className="px-3 pb-2">
          <hr className="border-gray-800" />
        </div>

        {/* Footer */}
        <div className="px-3 pb-4">
          <div className="text-center space-y-1">
            <p className="text-[10px] text-gray-500 font-medium">
              2026 @ InfraLift LLP
            </p>
            <p className="text-[9px] text-gray-600">
              All rights reserved
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
