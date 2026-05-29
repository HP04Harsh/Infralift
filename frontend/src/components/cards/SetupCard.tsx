"use client";

import { Check, Copy, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SetupCardProps {
  stepNumber: number;
  title: string;
  description: string;
  command: string;
  isCompleted: boolean;
  isVerified: boolean;
  onCopy: () => void;
  onVerify: () => Promise<void>;
  isVerifying?: boolean;
}

export function SetupCard({
  stepNumber,
  title,
  description,
  command,
  isCompleted,
  isVerified,
  onCopy,
  onVerify,
  isVerifying = false,
}: SetupCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(command);
    if (success) {
      setCopied(true);
      onCopy();
      toast({
        title: "Command copied to clipboard",
        description: "You can now paste it in your terminal",
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        title: "Failed to copy",
        description: "Please copy the command manually",
        variant: "destructive",
      });
    }
  };

  const handleVerify = async () => {
    await onVerify();
  };

  return (
    <Card className="transition-all hover:shadow-md border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-7 h-7 min-w-[28px] min-h-[28px] flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-all",
              isCompleted
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-gray-300 bg-white text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
            )}
          >
            {isCompleted ? (
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <span className="text-xs font-medium">{stepNumber}</span>
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white whitespace-normal">{title}</CardTitle>
            <CardDescription className="mt-0.5 text-xs text-gray-500 dark:text-slate-400 whitespace-normal">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Command Block */}
          <div className="relative bg-gray-900 dark:bg-slate-950 rounded-md p-3 overflow-x-auto min-w-0">
            <pre className="text-xs text-gray-100 dark:text-slate-200 font-mono whitespace-pre-wrap break-all">
              {command}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-1.5 right-1.5 text-gray-400 hover:text-white dark:text-slate-400 dark:hover:text-white h-6 w-6 p-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Verification Button */}
          {!isVerified && (
            <div className="flex items-center justify-between">
              {isCompleted && (
                <Button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full sm:w-auto h-8 text-xs"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Assignment"
                  )}
                </Button>
              )}
              {!isCompleted && (
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  Copy and run the command above to proceed
                </span>
              )}
            </div>
          )}

          {/* Verified State */}
          {isVerified && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-medium">Verified successfully</span>
            </div>
          )}

          {/* Error State */}
          {!isVerified && isCompleted && !isVerifying && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs">
                Click verify to check the assignment
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
