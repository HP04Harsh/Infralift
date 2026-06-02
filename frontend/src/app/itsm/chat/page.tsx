"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AgentChat } from "@/components/chat/AgentChat";

function ChatContent({ agentName, agentType }: { agentName: string; agentType: string }) {
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt") || "";
  
  return (
    <AgentChat
      agentName={agentName}
      agentType={agentType}
      initialPrompt={prompt}
    />
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <ChatContent agentName="ITSM Agent" agentType="itsm" />
    </Suspense>
  );
}
