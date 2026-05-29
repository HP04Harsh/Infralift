"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/themeStore";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("light");
    }
  };

  const isDark = theme === "dark" || (theme === "system" && 
    window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-8 w-8 border-gray-300 dark:border-slate-600"
      >
        <Moon className="h-4 w-4 text-gray-700 dark:text-slate-300" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "rounded-full h-8 w-8 transition-all",
        "border-gray-300 dark:border-slate-600",
        "hover:bg-gray-100 dark:hover:bg-slate-800",
        "hover:border-gray-400 dark:hover:border-slate-500"
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-gray-700 dark:text-slate-300" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
