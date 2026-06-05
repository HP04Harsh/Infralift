"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { apiService } from "@/services/api";

export function TenantConnectForm() {
  const { completedSteps, completeStep, setCurrentStep, setTenantId, setSubscriptionId, setClientId, setClientSecret, setEnvironmentName } = useOnboardingStore();
  const step1Completed = completedSteps.includes(1);
  
  const [formData, setFormData] = useState({
    clientId: "",
    clientSecret: "",
    tenantId: "",
    subscriptionId: "",
    environmentName: "",
    notes: "",
  });
  
  const [showSecret, setShowSecret] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const isFormValid = formData.clientId && formData.clientSecret && formData.tenantId && formData.subscriptionId && formData.environmentName;

  const handleConnect = async () => {
    if (!step1Completed) return;
    
    setIsConnecting(true);
    setConnectError("");
    
    try {
      const res = await apiService.connectTenant({
        client_id: formData.clientId,
        client_secret: formData.clientSecret,
        tenant_id: formData.tenantId,
        subscription_id: formData.subscriptionId,
        environment_name: formData.environmentName,
        user_id: "default",
      });
      
      if (!(res as any)?.success) {
        setConnectError((res as any)?.message || "Failed to connect tenant");
        setIsConnecting(false);
        return;
      }
      
      // Store all credentials in onboarding store
      setTenantId(formData.tenantId);
      setSubscriptionId(formData.subscriptionId);
      setClientId(formData.clientId);
      setClientSecret(formData.clientSecret);
      setEnvironmentName(formData.environmentName);
      
      // Complete step 2 and move to step 3
      completeStep(2);
      setCurrentStep(3);
    } catch (err: any) {
      setConnectError(err?.message || "Connection failed. Please check your credentials and try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getFieldState = (field: string, value: string) => {
    if (!touched[field]) return "default";
    if (value) return "valid";
    return "invalid";
  };

  const renderFieldIcon = (state: string) => {
    if (state === "valid") {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />;
    }
    if (state === "invalid") {
      return <AlertCircle className="h-4 w-4 text-red-500 absolute right-3 top-1/2 -translate-y-1/2" />;
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
              Connect Azure Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 2-column layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Client ID
                    </Label>
                    <div className="relative">
                      <Input
                        id="clientId"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        onBlur={() => handleBlur("clientId")}
                        className="dark:bg-slate-900 dark:border-slate-600 dark:text-white h-10 text-xs pr-10"
                      />
                      {renderFieldIcon(getFieldState("clientId", formData.clientId))}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      The application ID from the SP output
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenantId" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Tenant ID
                    </Label>
                    <div className="relative">
                      <Input
                        id="tenantId"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={formData.tenantId}
                        onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                        onBlur={() => handleBlur("tenantId")}
                        className="dark:bg-slate-900 dark:border-slate-600 dark:text-white h-10 text-xs pr-10"
                      />
                      {renderFieldIcon(getFieldState("tenantId", formData.tenantId))}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      The tenant value from the SP output
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subscriptionId" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Subscription ID
                    </Label>
                    <div className="relative">
                      <Input
                        id="subscriptionId"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={formData.subscriptionId}
                        onChange={(e) => setFormData({ ...formData, subscriptionId: e.target.value })}
                        onBlur={() => handleBlur("subscriptionId")}
                        className="dark:bg-slate-900 dark:border-slate-600 dark:text-white h-10 text-xs pr-10"
                      />
                      {renderFieldIcon(getFieldState("subscriptionId", formData.subscriptionId))}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      The subscription to scan for resources
                    </p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientSecret" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Client Secret
                    </Label>
                    <div className="relative">
                      <Input
                        id="clientSecret"
                        type={showSecret ? "text" : "password"}
                        placeholder="•••••••••••••••••"
                        value={formData.clientSecret}
                        onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                        onBlur={() => handleBlur("clientSecret")}
                        className="dark:bg-slate-900 dark:border-slate-600 dark:text-white h-10 text-xs pr-20"
                      />
                      {renderFieldIcon(getFieldState("clientSecret", formData.clientSecret))}
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      The password from the SP output
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="environmentName" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Environment Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="environmentName"
                        placeholder="e.g. Production — APAC, Dev Sandbox…"
                        value={formData.environmentName}
                        onChange={(e) => setFormData({ ...formData, environmentName: e.target.value })}
                        onBlur={() => handleBlur("environmentName")}
                        className="dark:bg-slate-900 dark:border-slate-600 dark:text-white h-10 text-xs pr-10"
                      />
                      {renderFieldIcon(getFieldState("environmentName", formData.environmentName))}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      A friendly label for this tenant in Infralift
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                  Optional Notes
                </Label>
                <textarea
                  id="notes"
                  placeholder="Add any notes about this tenant connection…"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-azure-500 focus:border-transparent dark:bg-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Connect Button */}
              <div className="pt-2">
                {connectError && (
                  <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-600 dark:text-red-400">{connectError}</p>
                  </div>
                )}
                <Button
                  onClick={handleConnect}
                  disabled={!step1Completed || !isFormValid || isConnecting}
                  className="w-full h-10 text-xs"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Tenant"
                  )}
                </Button>
                {!step1Completed && (
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-2 text-center">
                    Available once Step 1 is complete.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
    </motion.div>
  );
}
