import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AttendanceRecord {
  worker_id: number;
  worker_name: string;
  date: string;
  status: 'present' | 'absent' | 'vacation' | 'sick';
  check_in: string;
  check_out: string;
  notes: string;
}

interface AttendanceState {
  records: AttendanceRecord[];
  upsertRecord: (record: AttendanceRecord) => void;
  upsertRecords: (records: AttendanceRecord[]) => void;
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set) => ({
      records: [],
      upsertRecord: (newRecord) => set((state) => {
        const existingIdx = state.records.findIndex(r => r.worker_id === newRecord.worker_id && r.date === newRecord.date);
        if (existingIdx !== -1) {
          const newRecords = [...state.records];
          newRecords[existingIdx] = newRecord;
          return { records: newRecords };
        }
        return { records: [...state.records, newRecord] };
      }),
      upsertRecords: (newRecords) => set((state) => {
        let currentRecords = [...state.records];
        newRecords.forEach(newRecord => {
          const existingIdx = currentRecords.findIndex(r => r.worker_id === newRecord.worker_id && r.date === newRecord.date);
          if (existingIdx !== -1) {
            currentRecords[existingIdx] = newRecord;
          } else {
            currentRecords.push(newRecord);
          }
        });
        return { records: currentRecords };
      }),
    }),
    {
      name: 'attendance-storage'
    }
  )
);
