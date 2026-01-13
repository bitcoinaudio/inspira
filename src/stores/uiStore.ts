import { create } from 'zustand';

interface UIStore {
  theme: string;
  setTheme: (theme: string) => void;
}

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem('inspira-theme');
  return saved || 'dark';
};

export const useUIStore = create<UIStore>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme: string) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('inspira-theme', theme);
      }
    } catch {
      // ignore storage errors (private mode, blocked storage, etc.)
    }
    set({ theme });
  },
}));
