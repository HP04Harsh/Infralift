"use client";

import { useState, useRef } from "react";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypingText } from "@/components/ui/typing-text";

interface AnimatedChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholderTexts?: string[];
  disabled?: boolean;
}

export function AnimatedChatInput({
  value,
  onChange,
  onSubmit,
  placeholderTexts = ["Ask anything..."],
  disabled = false,
}: AnimatedChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = value.length > 0;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) onSubmit();
    }
  };

  return (
    <div
      className="rounded-[16px] p-[2px] shadow-sm animate-[borderRotate_7s_linear_infinite]"
      style={{
        background: "conic-gradient(from var(--border-angle), #3B82F6, #8B5CF6, #06B6D4, #EC4899, #3B82F6)",
      }}
    >
      <div
        className={`rounded-[14px] flex items-center transition-all duration-300 bg-white dark:bg-slate-900 ${
          isFocused ? "shadow-[0_0_20px_rgba(59,130,246,0.12)]" : ""
        }`}
      >
        <div className="flex-shrink-0 pl-4">
          <MessageCircle className="h-5 w-5 text-gray-400 dark:text-slate-500" />
        </div>
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            className="w-full h-14 px-3 border-0 bg-transparent text-gray-900 dark:text-white placeholder-transparent focus:outline-none focus:ring-0 text-base disabled:opacity-50"
          />
          {!hasValue && !isFocused && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none overflow-hidden max-w-full">
              <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                <TypingText texts={placeholderTexts} />
              </div>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 pr-2">
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="h-10 w-10 p-0 rounded-xl bg-azure-500 hover:bg-azure-600 transition-colors disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
