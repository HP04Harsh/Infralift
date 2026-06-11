"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortalLoader } from "@/components/ui/PortalLoader";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const redirect = () => {
      const authToken = localStorage.getItem("auth_token");
      if (!authToken) {
        router.replace("/landing");
        return;
      }
      try {
        const stored = localStorage.getItem("infralift-onboarding-storage");
        if (stored) {
          const parsed = JSON.parse(stored);
          const { state } = parsed;
          if (state?.isCompleted || state?.progress >= 100) {
            router.replace("/dashboard");
            return;
          }
        }
      } catch {
        // If parsing fails, redirect to onboarding
      }
      router.replace("/onboarding");
    };

    redirect();
  }, [router]);

  return <PortalLoader messages={["Initializing...", "Checking session...", "Preparing your workspace..."]} />;
}
