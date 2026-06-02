"use client";

import { cn } from "@/lib/utils";

interface RGBTextProps {
  children: React.ReactNode;
  className?: string;
}

export function RGBText({ children, className }: RGBTextProps) {
  return (
    <span 
      className={cn(
        "bg-gradient-to-r from-red-500 via-green-500 to-blue-500 bg-clip-text text-transparent animate-gradient-x",
        className
      )}
      style={{
        backgroundSize: "200% 200%",
        animation: "gradient-rotate 3s ease infinite",
      }}
    >
      {children}
    </span>
  );
}
