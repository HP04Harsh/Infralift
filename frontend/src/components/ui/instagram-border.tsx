"use client";

import { cn } from "@/lib/utils";

interface InstagramBorderProps {
  children: React.ReactNode;
  className?: string;
}

export function InstagramBorder({ children, className }: InstagramBorderProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 rounded-2xl p-[2px]">
        <div className="h-full w-full rounded-2xl animate-spin" style={{
          background: "linear-gradient(90deg, #ff0000, #0000ff, #ff0000)",
          backgroundSize: "200% 200%",
          animation: "gradient-rotate 3s linear infinite",
        }} />
      </div>
      <div className="absolute inset-[2px] rounded-2xl bg-white dark:bg-slate-900" />
      <div className="relative z-10">
        {children}
      </div>
      <style jsx>{`
        @keyframes gradient-rotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
