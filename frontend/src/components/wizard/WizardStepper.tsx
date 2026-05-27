"use client";

import { Check, Circle } from "lucide-react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "Create Service Principal" },
  { id: 2, title: "Connect Tenant" },
  { id: 3, title: "Sync Resources" },
  { id: 4, title: "Complete Setup" },
];

export function WizardStepper() {
  const { currentStep, completedSteps } = useOnboardingStore();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isActive = currentStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 min-w-[32px] min-h-[32px] flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-all",
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isActive
                      ? "bg-azure-500 border-azure-500 text-white"
                      : "border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <span className="text-xs font-medium">{step.id}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className={cn(
                      "text-xs font-medium truncate transition-colors",
                      isActive 
                        ? "text-gray-900 dark:text-white" 
                        : "text-gray-500 dark:text-slate-400"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-3 min-w-[1.5rem] rounded-full transition-all",
                    isCompleted ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-700"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1 mb-5">
        <div
          className="bg-azure-500 h-1 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${((completedSteps.length / steps.length) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
