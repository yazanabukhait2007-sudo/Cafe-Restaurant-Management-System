import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Worker {
  id: number;
  name: string;
  phone: string;
  alt_phone: string;
  address: string;
  national_id: string;
  age?: number;
  notes: string;
  last_workplace: string;
  current_job: string;
  salary: number;
  has_social_security: number;
  social_security_amount: number;
}

interface WorkersState {
  workers: Worker[];
  addWorker: (worker: Omit<Worker, 'id'>) => void;
  updateWorker: (id: number, worker: Partial<Worker>) => void;
  deleteWorker: (id: number) => void;
}

export const useWorkersStore = create<WorkersState>()(
  persist(
    (set) => ({
      workers: [
        {
          id: 1,
          name: "أحمد عبدالله",
          phone: "0791234567",
          alt_phone: "",
          address: "عمان",
          national_id: "9981023948",
          age: 28,
          notes: "",
          last_workplace: "مخبز المدينة",
          current_job: "خباز",
          salary: 400,
          has_social_security: 1,
          social_security_amount: 30
        }
      ],
      addWorker: (workerData) => set((state) => ({
        workers: [
          ...state.workers,
          {
            ...workerData,
            id: state.workers.length > 0 ? Math.max(...state.workers.map(w => w.id)) + 1 : 1
          }
        ]
      })),
      updateWorker: (id, workerData) => set((state) => ({
        workers: state.workers.map((w) => w.id === id ? { ...w, ...workerData } : w)
      })),
      deleteWorker: (id) => set((state) => ({
        workers: state.workers.filter((w) => w.id !== id)
      }))
    }),
    {
      name: 'workers-storage'
    }
  )
);
