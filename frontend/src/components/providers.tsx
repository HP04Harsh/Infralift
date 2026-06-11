"use client";

import { ReactNode, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { InfraMini } from "@/components/assistant/InfraMini";
import { useSettingsStore } from "@/store/settingsStore";

function AppearanceApplier() {
  const customization = useSettingsStore((s) => s.customization);
  const appearance = useSettingsStore((s) => s.appearance);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.style.setProperty("--primary-color", customization.primaryColor);
    root.style.setProperty("--accent-color", customization.accentColor);
    root.style.setProperty("--border-radius", `${customization.borderRadius}px`);

    root.setAttribute("data-glassmorphism", String(customization.glassmorphismEnabled));
    root.setAttribute("data-compact", String(customization.compactMode));

    const fontMap: Record<string, string> = {
      inter: "'Inter', system-ui, sans-serif",
      poppins: "'Poppins', system-ui, sans-serif",
      manrope: "'Manrope', system-ui, sans-serif",
      sora: "'Sora', system-ui, sans-serif",
    };
    root.style.setProperty("--font-family", fontMap[customization.font] || fontMap.inter);
    body.style.fontFamily = fontMap[customization.font] || fontMap.inter;

    const fontLinkId = "dynamic-font-link";
    let link = document.getElementById(fontLinkId) as HTMLLinkElement;
    const googleFontName = customization.font.charAt(0).toUpperCase() + customization.font.slice(1);
    const fontUrl = `https://fonts.googleapis.com/css2?family=${googleFontName}:wght@400;500;600;700&display=swap`;
    if (!link) {
      link = document.createElement("link");
      link.id = fontLinkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = fontUrl;
  }, [customization]);

  useEffect(() => {
    const intensityMap = { low: 0.25, medium: 0.5, high: 0.75 };
    const root = document.documentElement;
    root.style.setProperty("--ui-opacity", String(appearance.transparencyLevel / 100));
    root.style.setProperty("--sidebar-width", appearance.compactSidebar ? "16rem" : "18rem");
    root.style.setProperty("--anim-intensity", String(intensityMap[appearance.animationIntensity]));
  }, [appearance]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppearanceApplier />
      {children}
      <Toaster />
      <InfraMini />
    </ThemeProvider>
  );
}
