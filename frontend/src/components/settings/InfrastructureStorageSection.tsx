"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Database, HardDrive, Cloud, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/api";
import type { InfrastructureStorageSettings } from "@/store/settingsStore";

interface Props {
  settings: InfrastructureStorageSettings;
  onUpdate: (settings: Partial<InfrastructureStorageSettings>) => void;
}

export function InfrastructureStorageSection({ settings, onUpdate }: Props) {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"idle" | "success" | "error">("idle");

  const storageTypes = [
    { value: "azure_blob", label: "Azure Blob Storage", icon: <Cloud className="h-4 w-4" /> },
    { value: "azure_files", label: "Azure Files", icon: <HardDrive className="h-4 w-4" /> },
    { value: "azure_data_lake", label: "Azure Data Lake", icon: <Database className="h-4 w-4" /> },
  ];

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult("idle");
    if (!settings.storageAccount || !settings.containerName || !settings.accessKey) {
      setValidationResult("error");
      setValidating(false);
      return;
    }
    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${settings.storageAccount};AccountKey=${settings.accessKey};EndpointSuffix=core.windows.net`;
    try {
      await apiService.validateStorage({ connectionString, containerName: settings.containerName });
      setValidationResult("success");
      onUpdate({ validated: true });
    } catch {
      setValidationResult("error");
      onUpdate({ validated: false });
    }
    setValidating(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Infrastructure State Storage
      </h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Configure Azure storage for Terraform artifacts and deployment state. 
        Every successful deployment automatically generates and stores Terraform files here.
      </p>

      <div className="space-y-6 max-w-2xl">
        {/* Storage Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Storage Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {storageTypes.map((type) => (
              <motion.button
                key={type.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onUpdate({ storageType: type.value as InfrastructureStorageSettings["storageType"] })}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                  settings.storageType === type.value
                    ? "border-azure-500 bg-azure-50 dark:bg-azure-900/20 text-azure-700 dark:text-azure-300"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600"
                )}
              >
                {type.icon}
                <span className="text-xs font-medium text-center leading-tight">{type.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Storage Account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Storage Account Name
          </label>
          <input
            type="text"
            value={settings.storageAccount}
            onChange={(e) => onUpdate({ storageAccount: e.target.value, validated: false })}
            placeholder="e.g., infraliftterraform"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
          />
        </div>

        {/* Container Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Container / File Share Name
          </label>
          <input
            type="text"
            value={settings.containerName}
            onChange={(e) => onUpdate({ containerName: e.target.value, validated: false })}
            placeholder="e.g., terraform-artifacts"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
          />
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Terraform files will be stored in: <code className="text-azure-600 dark:text-azure-400">deployments/&lt;timestamp&gt;-&lt;resource-name&gt;/</code>
          </p>
        </div>

        {/* Access Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Access Key
          </label>
          <input
            type="password"
            value={settings.accessKey}
            onChange={(e) => onUpdate({ accessKey: e.target.value, validated: false })}
            placeholder="Storage account access key"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
          />
        </div>

        {/* Validate Button */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleValidate}
            disabled={validating || !settings.storageAccount || !settings.containerName}
            className="bg-azure-500 hover:bg-azure-600"
          >
            {validating ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Validating...
              </span>
            ) : (
              "Validate Connection"
            )}
          </Button>

          {validationResult === "success" && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              Connection Verified
            </span>
          )}
          {validationResult === "error" && (
            <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              Connection Failed
            </span>
          )}
        </div>

        {/* Storage Structure Preview */}
        {settings.validated && (
          <Card className="border-gray-200 dark:border-slate-700">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Storage Structure
              </h4>
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 font-mono text-xs text-gray-600 dark:text-slate-400">
                <p className="mb-1">{settings.containerName}/</p>
                <p className="text-emerald-600 dark:text-emerald-400 ml-4">└── deployments/</p>
                <p className="text-emerald-600 dark:text-emerald-400 ml-8">├── 2026-06-10-vm-production/</p>
                <p className="ml-12">├── main.tf</p>
                <p className="ml-12">├── variables.tf</p>
                <p className="ml-12">├── outputs.tf</p>
                <p className="ml-12">└── terraform.tfvars</p>
                <p className="text-emerald-600 dark:text-emerald-400 ml-8">├── 2026-06-10-storage-prod/</p>
                <p className="ml-12">├── main.tf</p>
                <p className="ml-12">└── ...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                Automatic Terraform Generation
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Every successful deployment through any agent will automatically generate 
                Terraform files (main.tf, variables.tf, outputs.tf, terraform.tfvars) and 
                store them in the configured storage container. Resource metadata is 
                persisted for cross-agent awareness.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
