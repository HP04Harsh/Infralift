"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const routes = [
  "/dashboard",
  "/provisioning",
  "/assessment",
  "/migration",
  "/observability",
  "/optimization",
  "/troubleshoot",
  "/itsm",
  "/compliance",
  "/settings",
  "/onboarding",
  "/dashboard/chat",
  "/provisioning/chat",
  "/assessment/chat",
  "/migration/chat",
  "/observability/chat",
  "/optimization/chat",
  "/troubleshoot/chat",
  "/itsm/chat",
  "/compliance/chat",
  "/provisioning/history",
  "/assessment/history",
  "/migration/history",
  "/compliance/violation",
];

export function RoutePreloader() {
  const router = useRouter();

  useEffect(() => {
    const prefetchRoutes = async () => {
      for (const route of routes) {
        try {
          router.prefetch(route);
        } catch {
          // Silently ignore prefetch errors
        }
      }
    };

    // Prefetch after a small delay to not block initial render
    const timer = setTimeout(prefetchRoutes, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
