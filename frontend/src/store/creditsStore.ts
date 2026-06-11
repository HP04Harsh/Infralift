import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CreditsState {
  remaining: number;
  used: number;
  total: number;
  setCredits: (remaining: number, used: number, total: number) => void;
  deduct: () => void;
}

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set) => ({
      remaining: 5,
      used: 0,
      total: 5,
      setCredits: (remaining, used, total) => set({ remaining, used, total }),
      deduct: () =>
        set((state) => ({
          remaining: Math.max(0, state.remaining - 1),
          used: state.used + 1,
        })),
    }),
    { name: 'infralift-credits' }
  )
);
