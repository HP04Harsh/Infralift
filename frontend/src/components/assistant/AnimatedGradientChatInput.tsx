"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TypingText } from "@/components/ui/typing-text";

interface QuickAction {
  label: string;
  prompt: string;
  icon?: React.ReactNode;
  iconBg?: string;
}

interface AnimatedGradientChatInputProps {
  title?: string;
  icon?: React.ReactNode;
  quickActions: QuickAction[];
  placeholderVariants: string[];
  className?: string;
  agentType?: string;
  onSubmit?: (value: string) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  simple?: boolean;
}

export function AnimatedGradientChatInput({
  title,
  icon,
  quickActions,
  placeholderVariants,
  className,
  agentType,
  onSubmit,
  value: externalValue,
  onValueChange,
  simple,
}: AnimatedGradientChatInputProps) {
  const router = useRouter();
  const [internalValue, setInternalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const inputValue = externalValue !== undefined ? externalValue : internalValue;
  const updateValue = (val: string) => {
    if (onValueChange) onValueChange(val);
    else setInternalValue(val);
  };

  const handleQuickAction = (prompt: string) => {
    const trimmed = prompt.trim();
    if (trimmed) {
      updateValue(trimmed);
    }
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

  const hasValue = inputValue.length > 0;

  const content = (
    <>
      {title && (
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {icon}
            {title}
          </h2>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Animated border ring — padding creates the 2px border, inner bg covers the rest */}
        <div
          className="rounded-[16px] p-[2px] shadow-sm animate-[borderRotate_7s_linear_infinite]"
          style={{
            background: "conic-gradient(from var(--border-angle), #3B82F6, #8B5CF6, #06B6D4, #EC4899, #3B82F6)",
          }}
        >
          <div
            className={cn(
              "rounded-[14px] flex items-center transition-all duration-300",
              "bg-white dark:bg-slate-900",
              isFocused && "shadow-[0_0_20px_rgba(59,130,246,0.12)]"
            )}
          >
            <div className="flex-shrink-0 pl-4">
              <MessageCircle className="h-5 w-5 text-gray-400 dark:text-slate-500" />
            </div>
            <div className="relative flex-1 min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => updateValue(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full h-14 px-3 border-0 bg-transparent text-gray-900 dark:text-white placeholder-transparent focus:outline-none focus:ring-0 text-base"
              />
              {!hasValue && !isFocused && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none overflow-hidden max-w-full">
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                    <TypingText texts={placeholderVariants} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 pr-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                className="h-10 w-10 p-0 rounded-xl bg-azure-500 hover:bg-azure-600 transition-colors"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Capsules — static, no animation */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              type="button"
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
    </>
  );

  if (simple) {
    return content;
  }

  return (
    <div className={cn("bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm", className)}>
      {content}
    </div>
  );
}