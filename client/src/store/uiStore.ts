import { create } from 'zustand';
import { ToastData, ToastType } from '../components/ui/Toast';

type ModalName = 'addAccount' | 'addBudget' | 'addGoal' | 'contribute' | 'importCsv' | null;

interface UiState {
  sidebarOpen: boolean;
  activeModal: ModalName;
  modalData: Record<string, unknown>;
  toasts: ToastData[];
  theme: 'dark';
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openModal: (modal: ModalName, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  modalData: {},
  toasts: [],
  theme: 'dark',

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  openModal: (modal, data = {}) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: {} }),

  addToast: (type, message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: `toast-${++toastCounter}`, type, message }],
    })),

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
