import { create } from 'zustand';

interface StoreState {
  studentId: string;
  posts: unknown[];
  initStudentId: () => void;
}

export const useStore = create<StoreState>((set) => ({
  studentId: typeof window !== 'undefined' 
    ? localStorage.getItem('studentId') || `Student#${Math.floor(Math.random() * 9000 + 1000)}`
    : `Student#${Math.floor(Math.random() * 9000 + 1000)}`,
  posts: [],
  initStudentId: () => {
    const id = `Student#${Math.floor(Math.random() * 9000 + 1000)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('studentId', id);
    }
    set({ studentId: id });
  },
}));
