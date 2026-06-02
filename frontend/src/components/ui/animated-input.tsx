"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { TypingText } from "@/components/ui/typing-text";
import { MessageCircle } from "lucide-react";

interface AnimatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  placeholderTexts?: string[];
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ 
    placeholderTexts = ["Ask anything..."],
    className = "",
    value,
    onChange,
    onFocus,
    onBlur,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    useEffect(() => {
      setHasValue(value !== undefined && value !== "");
    }, [value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <div className="relative">
        <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500 z-20" />
        <input
          ref={ref}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "w-full h-12 pl-12 pr-24 rounded-full border-0 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-0 shadow-sm",
            className
          )}
          {...props}
        />
        {!hasValue && !isFocused && (
          <div className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none text-left">
            <TypingText texts={placeholderTexts} />
          </div>
        )}
      </div>
    );
  }
);

AnimatedInput.displayName = "AnimatedInput";
