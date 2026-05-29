"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { WizardStepper } from "@/components/wizard/WizardStepper";
import { SetupCard } from "@/components/cards/SetupCard";
import { RightSidebar } from "@/components/sidebar/RightSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingStore } from "@/store/onboardingStore";
import { CheckCircle, Circle, RefreshCw, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TenantConnectForm } from "@/components/dashboard/TenantConnectForm";
import { ConnectionAnimation } from "@/components/animations/ConnectionAnimation";

// Step 1 Cards - Create Service Principal
const servicePrincipalCards = [
  {
    id: "sp-1",
    title: "Login to Azure CLI",
    description: "Authenticate with your Azure account",
    command: "az login",
  },
  {
    id: "sp-2",
    title: "Create Service Principal",
    description: "Create a new service principal for Infralift",
    command: "az ad sp create-for-rbac --name Infralift --role Reader --scopes /subscriptions/{subscription-id} --sdk-auth",
  },
  {
    id: "sp-3",
    title: "Assign Reader Role",
    description: "Assign Reader role at subscription scope",
    command: "az role assignment create --assignee {app-id} --role Reader --scope /subscriptions/{subscription-id}",
  },
];

// Step 2 - Connect Tenant
export default function OnboardingPage() {
  const router = useRouter();
  const {
    currentStep,
    completedSteps,
    completedCards,
    verifiedCards,
    setCurrentStep,
    completeStep,
    completeCard,
    verifyCard,
    updateProgress,
    setTenantId,
    setSubscriptionId,
    updateResourceSync,
    resourceSync,
  } = useOnboardingStore();

  const { toast } = useToast();
  const [tenantId, setTenantIdInput] = useState("");
  const [subscriptionId, setSubscriptionIdInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [verifyingCard, setVerifyingCard] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showConnectionAnimation, setShowConnectionAnimation] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);

  // Start animation when entering step 3
  useEffect(() => {
    if (currentStep === 3) {
      if (!animationCompleted) {
        setShowConnectionAnimation(true);
      }
    } else {
      // Reset animation state when leaving step 3
      setShowConnectionAnimation(false);
      setAnimationCompleted(false);
      // Reset resource sync when leaving step 3
      updateResourceSync({ status: "pending", progress: 0, syncedResources: 0, totalResources: 150 });
    }
  }, [currentStep, animationCompleted, updateResourceSync]);

  // Calculate progress
  useEffect(() => {
    const totalCards = servicePrincipalCards.length;
    const completed = Object.values(completedCards).filter(Boolean).length;
    const progress = Math.round((completed / totalCards) * 25) + (completedSteps.length * 25);
    updateProgress(Math.min(progress, 100));
  }, [completedCards, completedSteps, updateProgress]);

  const handleCopy = (cardId: string) => {
    completeCard(cardId);
  };

  const handleVerify = async (cardId: string) => {
    setVerifyingCard(cardId);
    
    // Simulate API verification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Always succeed for demo - in production, call backend API
    verifyCard(cardId);
    toast({
      title: "Verification successful",
      description: "Assignment has been verified",
    });
    
    setVerifyingCard(null);
  };

  const handleStep1Complete = () => {
    const allCompleted = servicePrincipalCards.every(card => completedCards[card.id] && verifiedCards[card.id]);
    if (allCompleted) {
      completeStep(1);
      setCurrentStep(2);
    } else {
      toast({
        title: "Complete all steps",
        description: "Please complete and verify all commands before proceeding",
        variant: "destructive",
      });
    }
  };

  const handleConnectTenant = async () => {
    if (!tenantId || !subscriptionId) {
      toast({
        title: "Missing information",
        description: "Please provide both Tenant ID and Subscription ID",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setTenantId(tenantId);
    setSubscriptionId(subscriptionId);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsConnecting(false);
    completeStep(2);
    setCurrentStep(3);
    toast({
      title: "Tenant connected",
      description: "Successfully connected to your Azure tenant",
    });
  };

  const handleSyncResources = async () => {
    setShowConnectionAnimation(true);
  };

  const handleConnectionAnimationComplete = () => {
    setShowConnectionAnimation(false);
    setAnimationCompleted(true);
    updateResourceSync({ status: "completed", progress: 100, syncedResources: 150, totalResources: 150 });
    toast({
      title: "Sync completed",
      description: "All resources have been synced successfully",
    });
  };

  const handleCompleteSync = () => {
    completeStep(3);
    setCurrentStep(4);
  };

  const handleCompleteSetup = () => {
    setIsNavigating(true);
    completeStep(4);
    toast({
      title: "Setup completed",
      description: "Welcome to Infralift! Redirecting to dashboard...",
    });
    // Navigate to dashboard after a short delay
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3">
            {servicePrincipalCards.map((card, index) => (
              <SetupCard
                key={card.id}
                stepNumber={index + 1}
                title={card.title}
                description={card.description}
                command={card.command}
                isCompleted={completedCards[card.id] || false}
                isVerified={verifiedCards[card.id] || false}
                onCopy={() => handleCopy(card.id)}
                onVerify={() => handleVerify(card.id)}
                isVerifying={verifyingCard === card.id}
              />
            ))}
            <Button
              onClick={handleStep1Complete}
              className="w-full h-9 text-xs"
              disabled={!servicePrincipalCards.every(card => completedCards[card.id] && verifiedCards[card.id])}
            >
              I've completed these steps
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        );

      case 2:
        return <TenantConnectForm />;

      case 3:
        return (
          <>
            {showConnectionAnimation ? (
              <ConnectionAnimation onComplete={handleConnectionAnimationComplete} />
            ) : (
              <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-w-xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Sync Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {resourceSync.status === "pending" && (
                    <div className="text-center py-10">
                      <p className="text-gray-600 dark:text-slate-400 mb-5 text-sm">
                        Click the button below to start syncing your Azure resources
                      </p>
                      <Button onClick={handleSyncResources} disabled={isSyncing} className="h-9 text-xs">
                        {isSyncing ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          "Start Sync"
                        )}
                      </Button>
                    </div>
                  )}

                  {resourceSync.status === "syncing" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Syncing resources...</span>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-azure-500" />
                      </div>
                      <div className="bg-gray-100 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-azure-500 h-full transition-all duration-500"
                          style={{ width: `${resourceSync.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-slate-400">{resourceSync.syncedResources} / {resourceSync.totalResources} resources</span>
                        <span className="font-medium text-gray-900 dark:text-white">{Math.round(resourceSync.progress)}%</span>
                      </div>
                    </div>
                  )}

                  {resourceSync.status === "completed" && (
                    <div className="text-center py-10">
                      <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-5" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Sync Completed
                      </h3>
                      <p className="text-gray-600 dark:text-slate-400 mb-5 text-sm">
                        Successfully synced {resourceSync.totalResources} resources from Azure
                      </p>
                      <Button onClick={handleCompleteSync} className="h-9 text-xs">
                        Complete
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        );

      case 4:
        return (
          <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-w-lg mx-auto">
            <CardContent className="py-8">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Setup Complete!
                </h2>
                <p className="text-gray-600 dark:text-slate-400 mb-6 text-sm max-w-sm mx-auto">
                  Your Azure tenant is now connected and ready for automation
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm mx-auto">
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-gray-100 dark:border-slate-800">
                    <div className="text-2xl font-bold text-azure-500">150</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Resources Synced</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-gray-100 dark:border-slate-800">
                    <div className="text-2xl font-bold text-emerald-500">100%</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Setup Progress</div>
                  </div>
                </div>
                <Button onClick={handleCompleteSetup} disabled={isNavigating} className="h-9 text-xs">
                  {isNavigating ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Navigating...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header title="Connect Your Azure Tenant" userName="Harsh Pardhi" />
        
        <main className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
          <div className="flex-1 p-4 lg:p-5 max-w-[calc(100%-280px)]">
            <div className="max-w-3xl mx-auto">
              <WizardStepper />
              <div className="mt-5">
                {renderStep()}
              </div>
            </div>
          </div>
          
          <RightSidebar />
        </main>
      </div>
    </div>
  );
}
