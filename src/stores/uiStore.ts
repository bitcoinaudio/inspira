import { create } from 'zustand';

interface UIStore {
  theme: string;
  setTheme: (theme: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'dark',
  setTheme: (theme: string) => set({ theme }),
}));
