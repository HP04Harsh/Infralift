"use client";

import { cn } from "@/lib/utils";

interface InstagramBorderProps {
  children: React.ReactNode;
  className?: string;
}

export function InstagramBorder({ children, className }: InstagramBorderProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute -inset-4 overflow-hidden rounded-2xl">
        <div
          className="absolute -inset-[100%]"
          style={{
            background: "conic-gradient(from 0deg, #ff0000, #00ff00, #0000ff, #ff0000)",
            animation: "spin 3s linear infinite",
          }}
        />
      </div>
      <div className="absolute inset-[2px] rounded-2xl bg-white dark:bg-slate-900" />
      <div className="relative z-10">
        {children}
      </div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
