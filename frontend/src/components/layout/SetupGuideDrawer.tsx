"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { useRouter } from "next/navigation";

interface SetupGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    step: "1", title: "Create Azure Resource Group",
    desc: "Create a resource group in your Azure subscription to hold all AI resources.",
    command: "az group create --name infralift-ai-rg --location eastus"
  },
  {
    step: "2", title: "Deploy Azure OpenAI Service",
    desc: "Deploy an Azure OpenAI resource within the resource group.",
    command: "az cognitiveservices account create --name infralift-openai --resource-group infralift-ai-rg --kind OpenAI --sku S0 --location eastus --yes"
  },
  {
    step: "3", title: "Deploy a Model",
    desc: "Deploy a GPT model in Azure AI Studio or via CLI for agent conversations.",
    command: "az cognitiveservices account deployment create --name infralift-openai --resource-group infralift-ai-rg --deployment-name gpt-4 --model-name gpt-4 --model-version 0613 --model-format OpenAI"
  },
  {
    step: "4", title: "Grant Permissions",
    desc: "Assign the Cognitive Services OpenAI User role to yourself and service principals.",
    command: "az role assignment create --assignee {user-or-sp-object-id} --role \"Cognitive Services OpenAI User\" --scope /subscriptions/{subscription-id}/resourceGroups/infralift-ai-rg/providers/Microsoft.CognitiveServices/accounts/infralift-openai"
  },
  {
    step: "5", title: "Get Keys & Endpoint",
    desc: "Retrieve the endpoint URL and API key for the deployed Azure OpenAI resource.",
    command: "az cognitiveservices account keys list --name infralift-openai --resource-group infralift-ai-rg"
  },
];

export function SetupGuideDrawer({ isOpen, onClose }: SetupGuideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div
            ref={drawerRef}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-azure-100 dark:bg-azure-900/30 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-azure-600 dark:text-azure-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Portal Setup Guide</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Azure OpenAI configuration</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {steps.map((s) => (
                <div key={s.step}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-azure-100 dark:bg-azure-900/30 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-azure-600 dark:text-azure-400">{s.step}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.title}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                  <div className="ml-10">
                    <CodeBlock command={s.command} />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-200/50 dark:border-slate-800/50 space-y-2">
              <Button
                onClick={() => { onClose(); router.push("/portal/setup-guide"); }}
                className="w-full h-8 text-xs"
              >
                Open Full Guide
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
              <a
                href="https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300"
              >
                <ExternalLink className="h-3 w-3" />
                Open Azure OpenAI Portal
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
