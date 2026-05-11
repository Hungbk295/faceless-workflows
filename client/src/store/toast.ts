import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  items: ToastItem[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (message, variant = 'info') => {
    const id = nextId++;
    set({ items: [...get().items, { id, message, variant }] });
    setTimeout(() => get().dismiss(id), 3500);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

export function toast(message: string, variant: ToastVariant = 'info'): void {
  useToastStore.getState().push(message, variant);
}
