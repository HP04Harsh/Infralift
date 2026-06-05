"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InstagramBorder } from "@/components/ui/instagram-border";
import { AnimatedInput } from "@/components/ui/animated-input";

interface QuickAction {
  label: string;
  prompt: string;
  icon?: React.ReactNode;
  iconBg?: string;
}

interface AssistantInputModuleProps {
  title?: string;
  icon?: React.ReactNode;
  quickActions: QuickAction[];
  placeholderVariants: string[];
  className?: string;
  agentType?: string;
  onSubmit?: (value: string) => void;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function AssistantInputModule({
  title,
  icon,
  quickActions,
  placeholderVariants,
  className,
  agentType,
  onSubmit,
  value: externalValue,
  onValueChange,
}: AssistantInputModuleProps) {
  const router = useRouter();
  const [internalValue, setInternalValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const inputValue = externalValue !== undefined ? externalValue : internalValue;
  const updateValue = (val: string) => {
    if (onValueChange) onValueChange(val);
    else setInternalValue(val);
  };

  const handleQuickAction = (prompt: string) => {
    updateValue(prompt);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(prompt.length, prompt.length);
    }, 100);
  };

  const handleSubmit = () => {
    const value = inputValue.trim();
    if (value) {
      updateValue("");
      onSubmit?.(value);
      if (agentType) {
        router.push(`/${agentType}/chat?prompt=${encodeURIComponent(value)}`);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm", className)}>
      {/* Header */}
      {title && (
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {icon}
            {title}
          </h2>
        </div>
      )}

      {/* AI Input Box */}
      <div className="max-w-4xl mx-auto">
        <InstagramBorder className="w-full">
          <div className="relative flex items-center">
            <AnimatedInput
              ref={inputRef}
              value={inputValue}
              onChange={(e) => updateValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholderTexts={placeholderVariants}
              className="h-16 pr-14 rounded-2xl text-base text-left bg-transparent"
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-xl bg-azure-500 hover:bg-azure-600 transition-colors z-10"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </InstagramBorder>

        {/* Prompt Capsules */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              onClick={() => handleQuickAction(action.prompt)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-400 dark:hover:border-slate-500 transition-all shadow-sm"
            >
              {action.icon && <span className={cn("flex-shrink-0", action.iconBg)}>{action.icon}</span>}
              {action.label}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}