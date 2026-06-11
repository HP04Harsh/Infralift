import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNotificationStore } from './notificationStore';

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
        if (deployment.status === "completed") {
          useNotificationStore.getState().addNotification({
            title: `Deployment completed: ${deployment.name}`,
            message: `${deployment.type} "${deployment.name}" deployed successfully`,
            status: "success",
            category: "deployment",
            source: "deployment",
            severity: "info",
          });
        } else if (deployment.status === "failed") {
          useNotificationStore.getState().addNotification({
            title: `Deployment failed: ${deployment.name}`,
            message: `${deployment.type} "${deployment.name}" deployment failed`,
            status: "error",
            category: "deployment",
            source: "deployment",
            severity: "high",
          });
        }
      },

      setDeployments: (deployments) => {
        set({ deployments });
      },

      updateStatus: (id, status) => {
        let name = "";
        set((state) => {
          const dep = state.deployments.find((d) => d.id === id);
          if (dep) name = dep.name;
          return {
            deployments: state.deployments.map((d) =>
              d.id === id ? { ...d, status } : d
            ),
          };
        });
        if (name) {
          if (status === "completed") {
            useNotificationStore.getState().addNotification({
              title: `Deployment completed: ${name}`,
              message: `Deployment "${name}" finished successfully`,
              status: "success",
              category: "deployment",
              source: "deployment",
              severity: "info",
            });
          } else if (status === "failed") {
            useNotificationStore.getState().addNotification({
              title: `Deployment failed: ${name}`,
              message: `Deployment "${name}" failed`,
              status: "error",
              category: "deployment",
              source: "deployment",
              severity: "high",
            });
          }
        }
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
