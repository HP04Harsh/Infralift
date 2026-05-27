import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  completedCards: Record<string, boolean>;
  verifiedCards: Record<string, boolean>;
  progress: number;
  tenantId: string;
  subscriptionId: string;
  searchQuery: string;
  resourceSync: {
    totalResources: number;
    syncedResources: number;
    status: 'pending' | 'syncing' | 'completed' | 'failed';
  };
  
  // Actions
  setCurrentStep: (step: number) => void;
  completeStep: (step: number) => void;
  completeCard: (cardId: string) => void;
  verifyCard: (cardId: string) => void;
  updateProgress: (progress: number) => void;
  setTenantId: (tenantId: string) => void;
  setSubscriptionId: (subscriptionId: string) => void;
  setSearchQuery: (query: string) => void;
  updateResourceSync: (data: Partial<OnboardingState['resourceSync']>) => void;
  resetOnboarding: () => void;
}

const initialState = {
  currentStep: 1,
  completedSteps: [],
  completedCards: {},
  verifiedCards: {},
  progress: 0,
  tenantId: '',
  subscriptionId: '',
  searchQuery: '',
  resourceSync: {
    totalResources: 0,
    syncedResources: 0,
    status: 'pending',
  },
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      completeStep: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),
      
      completeCard: (cardId) =>
        set((state) => ({
          completedCards: { ...state.completedCards, [cardId]: true },
        })),
      
      verifyCard: (cardId) =>
        set((state) => ({
          verifiedCards: { ...state.verifiedCards, [cardId]: true },
        })),
      
      updateProgress: (progress) => set({ progress }),
      
      setTenantId: (tenantId) => set({ tenantId }),
      
      setSubscriptionId: (subscriptionId) => set({ subscriptionId }),
      
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      
      updateResourceSync: (data) =>
        set((state) => ({
          resourceSync: { ...state.resourceSync, ...data },
        })),
      
      resetOnboarding: () => set(initialState),
    }),
    {
      name: 'infralift-onboarding-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        completedCards: state.completedCards,
        verifiedCards: state.verifiedCards,
        progress: state.progress,
        tenantId: state.tenantId,
        subscriptionId: state.subscriptionId,
      }),
    }
  )
);
