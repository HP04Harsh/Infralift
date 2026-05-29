"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  onSubmit?: (value: string) => void;
}

export function AssistantInputModule({
  title,
  icon,
  quickActions,
  placeholderVariants,
  className,
  onSubmit,
}: AssistantInputModuleProps) {
  const [inputValue, setInputValue] = useState("");
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Animate placeholders
  useEffect(() => {
    if (inputValue) return; // Don't rotate while typing

    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholderVariants.length);
    }, 4000); // Rotate every 4 seconds

    return () => clearInterval(interval);
  }, [inputValue, placeholderVariants.length]);

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(prompt.length, prompt.length);
    }, 100);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit?.(inputValue);
      setInputValue("");
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
      <div className="max-w-4xl mx-auto mb-5">
        <div className="relative flex items-center">
          <MessageCircle className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500 z-10" />
          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              {!inputValue && (
                <motion.div
                  key={currentPlaceholderIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
                >
                  <span className="text-sm text-gray-400 dark:text-slate-500 text-center px-14">
                    {placeholderVariants[currentPlaceholderIndex]}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full h-16 pl-14 pr-28 rounded-2xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 focus:border-transparent transition-all shadow-md text-base text-center"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-xl bg-azure-500 hover:bg-azure-600 transition-colors z-10"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Prompt Capsules */}
        <div className="flex flex-wrap justify-center gap-2 mt-3">
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