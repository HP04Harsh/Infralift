"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/themeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const appearance = useSettingsStore((s) => s.appearance);
  const updateAppearance = useSettingsStore((s) => s.updateAppearance);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync settingsStore theme -> themeStore on mount/store change
  useEffect(() => {
    if (appearance.theme && appearance.theme !== theme) {
      setTheme(appearance.theme);
    }
  }, [appearance.theme, theme, setTheme]);

  // Sync themeStore changes back to settingsStore
  useEffect(() => {
    if (theme === "system") {
      updateAppearance({ darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches, theme });
    } else {
      updateAppearance({ darkMode: theme === "dark", theme });
    }
  }, [theme, updateAppearance]);

  const cycleTheme = () => {
    const next: Record<string, string> = { light: "dark", dark: "system", system: "light" };
    setTheme(next[theme] as "light" | "dark" | "system");
  };

  const isDark =
    theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

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
      onClick={cycleTheme}
      title={`Theme: ${theme}`}
      className={cn(
        "rounded-full h-8 w-8 transition-all",
        "border-gray-300 dark:border-slate-600",
        "hover:bg-gray-100 dark:hover:bg-slate-800",
        "hover:border-gray-400 dark:hover:border-slate-500"
      )}
    >
      {theme === "system" ? (
        <Monitor className="h-4 w-4 text-gray-700 dark:text-slate-300" />
      ) : isDark ? (
        <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-gray-700 dark:text-slate-300" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
