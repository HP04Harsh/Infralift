import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DeploymentStatus = "completed" | "in-progress" | "failed";

export interface Deployment {
  id: string;
  name: string;
  type: string;
  status: DeploymentStatus;
  dateTime: string;
  initiatedBy: string;
  agentType: string;
}

interface DeploymentState {
  deployments: Deployment[];
  addDeployment: (deployment: Omit<Deployment, 'id' | 'dateTime'>) => void;
  updateStatus: (id: string, status: DeploymentStatus) => void;
  setDeployments: (deployments: Deployment[]) => void;
  getByStatus: (status: DeploymentStatus) => Deployment[];
  getRecent: (count?: number) => Deployment[];
}

export const useDeploymentStore = create<DeploymentState>()(
  persist(
    (set, get) => ({
      deployments: [],

      addDeployment: (deployment) => {
        const newDeployment: Deployment = {
          ...deployment,
          id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          dateTime: new Date().toLocaleString(),
        };
        set((state) => ({
          deployments: [newDeployment, ...state.deployments],
        }));
      },

      setDeployments: (deployments) => {
        set({ deployments });
      },

      updateStatus: (id, status) => {
        set((state) => ({
          deployments: state.deployments.map((d) =>
            d.id === id ? { ...d, status } : d
          ),
        }));
      },

      getByStatus: (status) => {
        return get().deployments.filter((d) => d.status === status);
      },

      getRecent: (count = 5) => {
        return get().deployments.slice(0, count);
      },
    }),
    {
      name: 'infralift-deployments-storage',
    }
  )
);
