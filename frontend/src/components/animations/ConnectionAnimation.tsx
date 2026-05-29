"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cloud } from "lucide-react";
import Image from "next/image";

export function ConnectionAnimation({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [dataPackets, setDataPackets] = useState<Array<{ id: number; position: number }>>([]);

  useEffect(() => {
    // Animate progress from 0 to 100 over 7.5 seconds
    const duration = 7500;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const newProgress = (currentStep / steps) * 100;
      setProgress(newProgress);

      // Add data packets periodically
      if (currentStep % 8 === 0) {
        setDataPackets(prev => [
          ...prev,
          { id: Date.now(), position: 0 }
        ]);
      }

      // Move existing packets
      setDataPackets(prev => 
        prev.map(packet => ({ ...packet, position: packet.position + 3 }))
          .filter(packet => packet.position < 100)
      );

      if (currentStep >= steps) {
        clearInterval(progressInterval);
        setTimeout(onComplete, 500);
      }
    }, interval);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Connecting to Azure
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Establishing secure connection and syncing your resources
        </p>
      </div>

      {/* Connection Animation */}
      <div className="relative flex items-center justify-between mb-8">
        {/* Azure Logo */}
        <div className="flex flex-col items-center z-10">
          <div className="w-24 h-24 bg-transparent rounded-2xl flex items-center justify-center">
            <Image
              src="/images/azure-logo.png"
              alt="Azure"
              width={80}
              height={80}
              className="object-contain"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement!;
                if (!parent.querySelector('.azure-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'azure-fallback';
                  fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0078d4" class="w-16 h-16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">Azure</p>
        </div>

        {/* Animated Line */}
        <div className="flex-1 mx-8 relative">
          {/* Base line */}
          <div className="h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-azure-500 to-purple-500"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Dotted overlay */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2">
            <div className="h-0.5 border-t-2 border-dashed border-gray-300 dark:border-slate-600" />
          </div>

          {/* Data Packets */}
          {dataPackets.map((packet) => (
            <motion.div
              key={packet.id}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-azure-500 rounded-full shadow-lg shadow-azure-500/50"
              initial={{ left: "0%" }}
              animate={{ left: `${packet.position}%` }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>

        {/* InfraLift Logo */}
        <div className="flex flex-col items-center z-10">
          <div className="w-24 h-24 bg-transparent rounded-2xl flex items-center justify-center">
            <Image
              src="/images/infralift-logo.png"
              alt="InfraLift"
              width={80}
              height={80}
              className="object-contain"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement!;
                if (!parent.querySelector('.infralift-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'infralift-fallback';
                  fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">InfraLift</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-azure-500 to-purple-500"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Progress Text */}
      <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-slate-400">
        <span>Connecting...</span>
        <span>{Math.round(progress)}%</span>
      </div>

      {/* Connection Steps */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: progress > 25 ? 1 : 0.5, y: progress > 25 ? 0 : 10 }}
          className="p-4 rounded-lg"
        >
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${progress > 25 ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'}`}>
            <span className="text-white text-sm">✓</span>
          </div>
          <p className="text-xs font-medium text-gray-900 dark:text-white">Authenticating</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: progress > 50 ? 1 : 0.5, y: progress > 50 ? 0 : 10 }}
          className="p-4 rounded-lg"
        >
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${progress > 50 ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'}`}>
            <span className="text-white text-sm">✓</span>
          </div>
          <p className="text-xs font-medium text-gray-900 dark:text-white">Syncing Data</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: progress > 75 ? 1 : 0.5, y: progress > 75 ? 0 : 10 }}
          className="p-4 rounded-lg"
        >
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${progress > 75 ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'}`}>
            <span className="text-white text-sm">✓</span>
          </div>
          <p className="text-xs font-medium text-gray-900 dark:text-white">Complete</p>
        </motion.div>
      </div>
    </div>
  );
}