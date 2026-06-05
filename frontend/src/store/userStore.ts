import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'reader' | 'itsm_engineer' | 'portal_admin' | 'global_engineer' | 'developer';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: string;
  mobile?: string;
  city?: string;
  reason?: string;
  email?: string;
}

export interface UserState {
  users: User[];
  
  // Actions
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  getUserByUsername: (username: string) => User | undefined;
  authenticateUser: (username: string, password: string) => User | null;
  resetUsers: () => void;
}

const defaultUsers: User[] = [
  {
    id: 'admin-001',
    username: 'admin',
    password: '123',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
];

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: defaultUsers,

      addUser: (userData) => {
        const newUser: User = {
          ...userData,
          id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          users: [...state.users, newUser],
        }));
      },

      updateUser: (id, updates) => {
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id ? { ...user, ...updates } : user
          ),
        }));
      },

      deleteUser: (id) => {
        set((state) => ({
          users: state.users.filter((user) => user.id !== id),
        }));
      },

      getUserByUsername: (username) => {
        return get().users.find((user) => user.username === username);
      },

      authenticateUser: (username, password) => {
        const user = get().getUserByUsername(username);
        if (user && user.password === password) {
          return user;
        }
        return null;
      },

      resetUsers: () => {
        set({ users: defaultUsers });
      },
    }),
    {
      name: 'infralift-users-storage',
    }
  )
);