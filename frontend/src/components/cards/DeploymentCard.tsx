"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, XCircle, AlertTriangle, Shield, DollarSign,
  Globe, Server, Database, Layers, Network, Box, Cloud, FileText,
  ChevronDown, ChevronUp, Loader2, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency as fmtCurrency } from "@/lib/currency";

interface ResourceItem {
  type: string;
  name: string;
}

interface CostDetail {
  item: string;
  monthly: number;
  hourly: number;
}

interface CostEstimate {
  currency: string;
  monthly: number;
  hourly: number;
  details: CostDetail[];
}

interface SecurityRec {
  title: string;
  priority: string;
}

interface ValidationIssue {
  rule?: string;
  message: string;
  file?: string;
  line?: number;
  severity?: string;
}

interface ValidationResult {
  tflint: { passed: boolean; issues: ValidationIssue[] };
  trivy: { passed: boolean; issues: ValidationIssue[] };
}

export interface DeploymentCardData {
  request_id: string;
  resource_name: string;
  resource_type: string;
  region: string;
  resource_group: string;
  resources: ResourceItem[];
  plan_summary: string;
  cost_estimate: CostEstimate;
  security_recommendations: SecurityRec[];
  terraform_path: string;
  validation?: ValidationResult;
  plan_output?: string;
}

interface DeploymentCardProps {
  data: DeploymentCardData;
  onApprove: () => void;
  onReject: () => void;
  loading?: boolean;
}

function formatCurrency(amount: number, currency: string): string {
  return fmtCurrency(amount, currency);
}

function getTypeIcon(type: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("azurerm_virtual_machine") || t.includes("azurerm_linux_virtual_machine") || t.includes("azurerm_windows_virtual_machine")) return <Server className="h-3.5 w-3.5" />;
  if (t.includes("storage_account")) return <Database className="h-3.5 w-3.5" />;
  if (t.includes("virtual_network")) return <Network className="h-3.5 w-3.5" />;
  if (t.includes("public_ip")) return <Globe className="h-3.5 w-3.5" />;
  if (t.includes("network_interface")) return <Layers className="h-3.5 w-3.5" />;
  if (t.includes("subnet")) return <Box className="h-3.5 w-3.5" />;
  if (t.includes("kubernetes_cluster")) return <Cloud className="h-3.5 w-3.5" />;
  if (t.includes("resource_group")) return <Layers className="h-3.5 w-3.5" />;
  return <Zap className="h-3.5 w-3.5" />;
}

export function DeploymentCard({ data, onApprove, onReject, loading }: DeploymentCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  const cost = data.cost_estimate;
  const secRecs = data.security_recommendations || [];
  const resources = data.resources || [];
  const validation = data.validation;

  const priorityColors: Record<string, string> = {
    high: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800",
    medium: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
    low: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-emerald-600 dark:bg-emerald-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-white" />
          <h3 className="text-sm font-semibold text-white">Deployment Ready for Approval</h3>
        </div>
        <p className="text-xs text-emerald-100 mt-1">
          REQ-{data.request_id} &middot; {data.resource_name} &middot; {data.region}
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* Quick Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700">
            <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</p>
            <p className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">{data.resource_type}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700">
            <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Region</p>
            <p className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">{data.region}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700">
            <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Resource Group</p>
            <p className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">{data.resource_group}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700">
            <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">TF Path</p>
            <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-0.5 truncate">{data.terraform_path}</p>
          </div>
        </div>

        {/* Resources */}
        {resources.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300"
            >
              <span>Planned Resources ({resources.length})</span>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showDetails && (
              <div className="px-3 pb-2 space-y-1">
                {resources.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-xs text-gray-600 dark:text-slate-400">
                    <span className="text-gray-400 dark:text-slate-500">{getTypeIcon(r.type)}</span>
                    <span className="font-mono text-[11px]">{r.type}</span>
                    <span className="text-gray-400">-</span>
                    <span>{r.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cost Estimate */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">Estimated Cost</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 ml-auto">
              {formatCurrency(cost.monthly, cost.currency)}/month
            </span>
          </div>
          <div className="space-y-1">
            {cost.details.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
                <span>{d.item}</span>
                <span>{formatCurrency(d.monthly, cost.currency)}/mo</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Recommendations */}
        {secRecs.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setShowSecurity(!showSecurity)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <span>Security Recommendations ({secRecs.length})</span>
              </div>
              {showSecurity ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showSecurity && (
              <div className="px-3 pb-3 space-y-1.5">
                {secRecs.map((rec, i) => (
                  <div key={i} className={cn("text-[11px] px-2.5 py-1.5 rounded-md border", priorityColors[rec.priority] || priorityColors.medium)}>
                    <span className="font-medium">{rec.title}</span>
                    <span className={cn(
                      "ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded",
                      rec.priority === "high" ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300" :
                      rec.priority === "medium" ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300" :
                      "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                    )}>{rec.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Validation Results */}
        {validation && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-500" />
                <span>Validation Results</span>
              </div>
              {showValidation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showValidation && (
              <div className="px-3 pb-3 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  {validation.tflint.passed ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className="text-gray-700 dark:text-slate-300">tflint</span>
                  <span className={validation.tflint.passed ? "text-emerald-600" : "text-amber-600"}>
                    {validation.tflint.passed ? "Passed" : `${validation.tflint.issues.length} issues`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {validation.trivy.passed ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className="text-gray-700 dark:text-slate-300">trivy security</span>
                  <span className={validation.trivy.passed ? "text-emerald-600" : "text-amber-600"}>
                    {validation.trivy.passed ? "Passed" : `${validation.trivy.issues.length} issues`}
                  </span>
                </div>
                {(!validation.tflint.passed || !validation.trivy.passed) && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    Issues found but non-blocking. Review before proceeding.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Plan Output */}
        {data.plan_output && (
          <details className="bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
            <summary className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Terraform Plan Output
            </summary>
            <pre className="px-3 pb-3 text-[11px] font-mono text-gray-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
              {data.plan_output}
            </pre>
          </details>
        )}

        {/* Approval Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={onApprove}
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-sm font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Approve & Deploy
          </Button>
          <Button
            onClick={onReject}
            disabled={loading}
            variant="outline"
            className="flex-1 h-10 text-sm font-semibold text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
