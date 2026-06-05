"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Terminal, Key, Shield, CheckCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/CodeBlock";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  {
    title: "Prerequisites",
    icon: CheckCircle,
    color: "text-emerald-500",
    items: [
      "An active Azure subscription",
      "Global Admin or Privileged Role Administrator permissions",
      "Azure CLI installed on your local machine",
    ],
  },
  {
    title: "1. Create Service Principal",
    icon: Key,
    color: "text-azure-500",
    steps: [
      { cmd: "az login", desc: "Authenticate with your Azure account" },
      { cmd: 'az ad sp create-for-rbac --name Infralift --role Reader --scopes /subscriptions/{subscription-id} --sdk-auth', desc: "Create service principal with Reader role" },
      { cmd: 'az role assignment create --assignee {app-id} --role Reader --scope /subscriptions/{subscription-id}', desc: "Assign Reader role at subscription scope" },
    ],
  },
  {
    title: "2. Configure Azure OpenAI",
    icon: Terminal,
    color: "text-purple-500",
    steps: [
      { cmd: "Deploy Azure OpenAI resource in Azure Portal", desc: "Go to Azure Portal → Create Azure OpenAI" },
      { cmd: "Deploy a model (e.g., gpt-4)", desc: "In Azure AI Studio, deploy a chat model" },
      { cmd: "Copy endpoint and API key", desc: "From Azure OpenAI resource → Keys and Endpoint" },
    ],
  },
  {
    title: "3. Required Permissions",
    icon: Shield,
    color: "text-amber-500",
    permissions: [
      "Microsoft.Authorization/roleAssignments/read",
      "Microsoft.Resources/subscriptions/read",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Network/networkInterfaces/read",
      "Microsoft.Storage/storageAccounts/read",
      "Microsoft.Sql/servers/databases/read",
    ],
  },
];

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[640px] md:max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-azure-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Portal Setup Guide</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {sections.map((section) => (
                <div key={section.title}>
                  <div className="flex items-center gap-2 mb-3">
                    <section.icon className={cn("h-4 w-4", section.color)} />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                  </div>

                  {"items" in section && (
                    <ul className="space-y-1.5 ml-6">
                      {(section as any).items.map((item: string) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-400">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {"steps" in section && (
                    <div className="space-y-3">
                      {(section as any).steps.map((step: any, i: number) => (
                        <div key={i}>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5">{step.desc}</p>
                          <CodeBlock command={step.cmd} />
                        </div>
                      ))}
                    </div>
                  )}

                  {"permissions" in section && (
                    <div className="space-y-1 ml-6">
                      {(section as any).permissions.map((perm: string) => (
                        <div key={perm} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400 font-mono">
                          <Shield className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          {perm}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="bg-gradient-to-r from-azure-50 to-purple-50 dark:from-azure-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-azure-100 dark:border-azure-900/50">
                <div className="flex items-start gap-3">
                  <ExternalLink className="h-4 w-4 text-azure-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-azure-700 dark:text-azure-400 mb-1">Need more help?</p>
                    <p className="text-xs text-azure-600 dark:text-azure-300/70">
                      Visit the Azure Portal documentation for detailed guides on service principal setup, 
                      permission management, and Azure OpenAI configuration.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-slate-800 flex justify-end">
              <Button onClick={onClose} size="sm" className="h-8 text-xs">
                Close
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


