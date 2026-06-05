"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PortalLoaderProps {
  messages?: string[];
}

const defaultMessages = [
  "Loading portal resources...",
  "Preparing infrastructure agents...",
  "Loading navigation...",
  "Restoring workspace...",
  "Finalizing startup...",
];

export function PortalLoader({ messages = defaultMessages }: PortalLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-slate-950 z-[9999] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12 text-azure-500" />
        </motion.div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Loading Infralift Portal
          </h1>
          <div className="h-5">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-gray-500 dark:text-slate-400"
              >
                {messages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="w-48 h-1 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-azure-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 10, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}
