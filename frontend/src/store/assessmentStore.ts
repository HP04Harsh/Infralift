import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AssessmentStatus = "completed" | "in-progress" | "failed";

export interface Assessment {
  id: string;
  name: string;
  type: string;
  status: AssessmentStatus;
  findings: number;
  details?: string;
  dateTime: string;
  initiatedBy: string;
  duration: number;
}

interface AssessmentState {
  assessments: Assessment[];
  totalDuration: number;
  addAssessment: (assessment: Omit<Assessment, 'id' | 'dateTime'>) => void;
  updateStatus: (id: string, status: AssessmentStatus, findings?: number) => void;
  setAssessments: (assessments: Assessment[]) => void;
  getTotalDurationFormatted: () => string;
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      assessments: [],
      totalDuration: 0,

      addAssessment: (assessment) => {
        const newAssessment: Assessment = {
          ...assessment,
          id: `assessment-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          dateTime: new Date().toLocaleString(),
        };
        set((state) => ({
          assessments: [newAssessment, ...state.assessments],
          totalDuration: state.totalDuration + assessment.duration,
        }));
      },

      setAssessments: (assessments) => {
        const totalDuration = assessments.reduce((sum, a) => sum + a.duration, 0);
        set({ assessments, totalDuration });
      },

      updateStatus: (id, status, findings) => {
        set((state) => ({
          assessments: state.assessments.map((a) =>
            a.id === id ? { ...a, status, ...(findings !== undefined ? { findings } : {}) } : a
          ),
        }));
      },

      getTotalDurationFormatted: () => {
        const total = get().totalDuration;
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
      },
    }),
    {
      name: 'infralift-assessments-storage',
    }
  )
);
