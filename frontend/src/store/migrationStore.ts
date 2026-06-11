import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNotificationStore } from './notificationStore';

export type MigrationStatus = "planned" | "in-progress" | "completed" | "failed";

export interface Migration {
  id: string;
  name: string;
  type: string;
  status: MigrationStatus;
  progress: number;
  dateTime: string;
  initiatedBy: string;
  duration: string;
  resourcesMigrated: number;
  totalResources: number;
}

interface MigrationState {
  migrations: Migration[];
  addMigration: (migration: Omit<Migration, 'id' | 'dateTime'>) => void;
  updateStatus: (id: string, status: MigrationStatus, progress?: number, resourcesMigrated?: number) => void;
  setMigrations: (migrations: Migration[]) => void;
  totalCompleted: () => number;
  totalInProgress: () => number;
  totalPlanned: () => number;
}

export const useMigrationStore = create<MigrationState>()(
  persist(
    (set, get) => ({
      migrations: [],

      addMigration: (migration) => {
        const newMigration: Migration = {
          ...migration,
          id: `migration-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          dateTime: new Date().toLocaleString(),
        };
        set((state) => ({
          migrations: [newMigration, ...state.migrations],
        }));
        if (migration.status === "completed") {
          useNotificationStore.getState().addNotification({
            title: `Migration completed: ${migration.name}`,
            message: `${migration.resourcesMigrated} of ${migration.totalResources} resources migrated`,
            status: "success",
            category: "activity",
            source: "migration",
            severity: "info",
          });
        }
      },

      setMigrations: (migrations) => {
        set({ migrations });
      },

      updateStatus: (id, status, progress, resourcesMigrated) => {
        let name = "";
        let migrated = 0;
        let total = 0;
        set((state) => {
          const m = state.migrations.find((m) => m.id === id);
          if (m) { name = m.name; migrated = m.resourcesMigrated; total = m.totalResources; }
          return {
            migrations: state.migrations.map((m) =>
              m.id === id
                ? {
                    ...m,
                    status,
                    ...(progress !== undefined ? { progress } : {}),
                    ...(resourcesMigrated !== undefined ? { resourcesMigrated } : {}),
                  }
                : m
            ),
          };
        });
        if (name && status === "completed") {
          useNotificationStore.getState().addNotification({
            title: `Migration completed: ${name}`,
            message: `${resourcesMigrated ?? migrated} of ${total} resources migrated successfully`,
            status: "success",
            category: "activity",
            source: "migration",
            severity: "info",
          });
        }
      },

      totalCompleted: () => get().migrations.filter((m) => m.status === "completed").length,
      totalInProgress: () => get().migrations.filter((m) => m.status === "in-progress").length,
      totalPlanned: () => get().migrations.filter((m) => m.status === "planned").length,
    }),
    {
      name: 'infralift-migrations-storage',
    }
  )
);