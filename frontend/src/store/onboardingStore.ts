import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OnboardingData {
  tenantId?: string;
  subscriptionId?: string;
  resourceGroup?: string;
  region?: string;
  assignmentName?: string;
  assignmentId?: string;
}

export interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  onboardingData: OnboardingData;
  isCompleted: boolean;
  startTime: number;
  progress: number;
  completedCards: Record<string, boolean>;
  verifiedCards: Record<string, boolean>;
  resourceSync: {
    isSyncing: boolean;
    lastSync: string;
    status: 'idle' | 'syncing' | 'completed' | 'failed';
  };
  
  // Actions
  setCurrentStep: (step: number) => void;
  completeStep: (step: number) => void;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  markCompleted: () => void;
  resetOnboarding: () => void;
  getProgress: () => number;
  updateProgress: (progress: number) => void;
  completeCard: (cardId: string) => void;
  verifyCard: (cardId: string) => void;
  setTenantId: (tenantId: string) => void;
  setSubscriptionId: (subscriptionId: string) => void;
  updateResourceSync: (sync: Partial<OnboardingState['resourceSync']>) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      completedSteps: [],
      onboardingData: {},
      isCompleted: false,
      startTime: Date.now(),
      progress: 0,
      completedCards: {},
      verifiedCards: {},
      resourceSync: {
        isSyncing: false,
        lastSync: '',
        status: 'idle',
      },

      setCurrentStep: (step) => set({ currentStep: step }),

      completeStep: (step) =>
        set((state) => ({
          completedSteps: Array.from(new Set([...state.completedSteps, step])),
        })),

      setOnboardingData: (data) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data },
        })),

      markCompleted: () =>
        set({
          isCompleted: true,
          currentStep: 5, // Assuming 5 steps total
          completedSteps: [1, 2, 3, 4, 5],
          progress: 100,
        }),

      resetOnboarding: () =>
        set({
          currentStep: 1,
          completedSteps: [],
          onboardingData: {},
          isCompleted: false,
          startTime: Date.now(),
          progress: 0,
          completedCards: {},
          verifiedCards: {},
          resourceSync: {
            isSyncing: false,
            lastSync: '',
            status: 'idle',
          },
        }),

      getProgress: () => {
        const state = get();
        return state.progress;
      },

      updateProgress: (progress) => set({ progress }),

      completeCard: (cardId) =>
        set((state) => ({
          completedCards: { ...state.completedCards, [cardId]: true },
        })),

      verifyCard: (cardId) =>
        set((state) => ({
          verifiedCards: { ...state.verifiedCards, [cardId]: true },
        })),

      setTenantId: (tenantId) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, tenantId },
        })),

      setSubscriptionId: (subscriptionId) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, subscriptionId },
        })),

      updateResourceSync: (syncData) =>
        set((state) => ({
          resourceSync: { ...state.resourceSync, ...syncData },
        })),
    }),
    {
      name: 'infralift-onboarding-storage',
    }
  )
);