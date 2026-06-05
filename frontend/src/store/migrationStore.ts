import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      },

      setMigrations: (migrations) => {
        set({ migrations });
      },

      updateStatus: (id, status, progress, resourcesMigrated) => {
        set((state) => ({
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
        }));
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