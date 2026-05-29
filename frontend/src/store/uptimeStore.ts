import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UptimeState {
  startTime: number;
  isHealthy: boolean;
  setStartTime: (time: number) => void;
  setHealthStatus: (isHealthy: boolean) => void;
  resetUptime: () => void;
  getUptime: () => string;
}

export const useUptimeStore = create<UptimeState>()(
  persist(
    (set, get) => ({
      startTime: Date.now(),
      isHealthy: true,
      setStartTime: (time) => set({ startTime: time }),
      setHealthStatus: (isHealthy) => set({ isHealthy }),
      resetUptime: () => set({ startTime: Date.now() }),
      getUptime: () => {
        const now = Date.now();
        const startTime = get().startTime;
        
        // Reset start time if it's been more than 24 hours or if it's in the future
        if (now - startTime > 24 * 60 * 60 * 1000 || startTime > now) {
          set({ startTime: now });
          return "00h 00m";
        }
        
        const diff = now - startTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
      },
    }),
    {
      name: 'infralift-uptime-storage',
    }
  )
);