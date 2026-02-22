import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  memberSidebarOpen: boolean;
  activeModal: string | null;
  toggleSidebar: () => void;
  toggleMemberSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  memberSidebarOpen: false,
  activeModal: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleMemberSidebar: () =>
    set((s) => ({ memberSidebarOpen: !s.memberSidebarOpen })),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
