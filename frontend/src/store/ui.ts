import { create } from 'zustand';

interface UIState {
  isChangingLanguage: boolean;
  setChangingLanguage: (val: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isChangingLanguage: false,
  setChangingLanguage: (val) => set({ isChangingLanguage: val })
}));
