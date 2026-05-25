import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Transaction {
  id: number;
  workerId: number;
  date: string; // YYYY-MM-DD
  type: 'deduction' | 'bonus' | 'payment';
  amount: number;
  description: string;
}

export interface Absence {
  id: number;
  workerId: number;
  date: string; // YYYY-MM-DD
  reason: string;
}

interface PayrollState {
  transactions: Transaction[];
  absences: Absence[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: number) => void;
  addAbsence: (absence: Omit<Absence, 'id'>) => void;
  deleteAbsence: (id: number) => void;
}

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set) => ({
      transactions: [],
      absences: [],
      addTransaction: (txData) => set((state) => ({
        transactions: [
          ...state.transactions,
           { ...txData, id: state.transactions.length > 0 ? Math.max(...state.transactions.map(t => t.id)) + 1 : 1 }
        ]
      })),
      deleteTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id)
      })),
      addAbsence: (absenceData) => set((state) => ({
        absences: [
          ...state.absences,
          { ...absenceData, id: state.absences.length > 0 ? Math.max(...state.absences.map(a => a.id)) + 1 : 1 }
        ]
      })),
      deleteAbsence: (id) => set((state) => ({
        absences: state.absences.filter(a => a.id !== id)
      }))
    }),
    {
      name: 'payroll-storage'
    }
  )
);
