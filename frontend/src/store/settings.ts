import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  cafeName: string;
  setCafeName: (name: string) => void;
  currency: string;
  // HR Settings
  workStartTime: string;
  workEndTime: string;
  breakDurationMinutes: number;
  overtimeRatePerHour: number;
  waterPricePerGuest: number;
  taxRate: number;
  updateHRSettings: (settings: {
    workStartTime: string;
    workEndTime: string;
    breakDurationMinutes: number;
    overtimeRatePerHour: number;
  }) => void;
  updatePOSSettings: (settings: {
    waterPricePerGuest?: number;
    taxRate?: number;
  }) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cafeName: 'Onyx Cafe',
      setCafeName: (name) => set({ cafeName: name }),
      
      // Default HR Settings
      workStartTime: '09:00',
      workEndTime: '17:00',
      breakDurationMinutes: 60,
      overtimeRatePerHour: 5, // e.g. 5 JOD per hour
      waterPricePerGuest: 1, // Default water price
      taxRate: 10, // Default tax rate
      currency: 'JOD',
      updateHRSettings: (settings) => set(settings),
      updatePOSSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: 'cafe-settings-storage', // unique name
    }
  )
);
