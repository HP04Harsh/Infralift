"use client";

import { Check, AlertTriangle, Shield, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOnboardingStore } from "@/store/onboardingStore";
import { cn } from "@/lib/utils";

const requirements = [
  { id: 1, name: "Azure CLI installed", status: "completed" as const },
  { id: 2, name: "Global Admin permissions", status: "warning" as const },
  { id: 3, name: "App registration access", status: "pending" as const },
  { id: 4, name: "Management group permissions", status: "warning" as const },
];

export function RightSidebar() {
  const { progress, completedSteps, currentStep } = useOnboardingStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="h-4 w-4 flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 flex-shrink-0" />;
      default:
        return <Clock className="h-4 w-4 flex-shrink-0" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-emerald-400 dark:text-emerald-400";
      case "warning":
        return "text-amber-400 dark:text-amber-400";
      default:
        return "text-gray-400 dark:text-slate-500";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 dark:bg-emerald-500/10";
      case "warning":
        return "bg-amber-500/10 dark:bg-amber-500/10";
      default:
        return "bg-gray-100 dark:bg-slate-800";
    }
  };

  return (
    <aside className="w-[280px] bg-gray-50 dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 p-5 overflow-y-auto flex-shrink-0">
      {/* Setup Progress Widget */}
      <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
            Setup Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Completed</span>
              <span className="text-xl font-bold text-azure-500 dark:text-azure-400">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400">
                Step {currentStep} of 4
              </span>
              <span className="text-gray-500 dark:text-slate-400">
                {completedSteps.length} steps completed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Widget */}
      <Card className="mb-4 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
            Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {requirements.map((req) => (
              <div
                key={req.id}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-md transition-all",
                  getStatusBg(req.status)
                )}
              >
                {getStatusIcon(req.status)}
                <span
                  className={cn(
                    "text-xs flex-1 font-medium truncate",
                    getStatusColor(req.status)
                  )}
                >
                  {req.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Notice Widget */}
      <Card className="border-amber-200 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <Shield className="h-4 w-4" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
            This setup requires Azure management permissions. Ensure least
            privilege access whenever possible.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
