"use client";

import { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { copyToClipboard, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CodeBlockProps {
  command: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ command, language = "bash", className }: CodeBlockProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(command);
    setCopied(true);
    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "Command copied successfully",
      });
    } else {
      toast({
        title: "Copy manually",
        description: "Select the command and press Ctrl+C",
      });
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group relative bg-gray-900 dark:bg-slate-950 rounded-lg border border-gray-700 dark:border-slate-800", className)}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 dark:border-slate-800 bg-gray-800 dark:bg-slate-900 rounded-t-lg">
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-gray-400" />
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="px-3 py-2.5 text-xs font-mono text-gray-100 dark:text-slate-200 whitespace-nowrap">
          <code>{command}</code>
        </pre>
      </div>
    </div>
  );
}
