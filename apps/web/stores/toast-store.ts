import { create } from "zustand";

export type ToastVariant = "notification" | "error" | "success" | "info";

export interface Toast {
    id: string;
    title: string;
    body: string;
    variant?: ToastVariant;
    avatarUrl?: string | null;
    channelId?: string;
    conversationId?: string;
    serverId?: string;
    timestamp: number;
}

interface ToastState {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, "id" | "timestamp">) => void;
    removeToast: (id: string) => void;
    clearAll: () => void;
}

const MAX_TOASTS = 3;
const TOAST_DURATION = 5000;

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],

    addToast: (toast) => {
        const id = `toast-${++toastCounter}-${Date.now()}`;
        const newToast: Toast = { ...toast, id, timestamp: Date.now() };

        set((state) => {
            const next = [newToast, ...state.toasts].slice(0, MAX_TOASTS);
            return { toasts: next };
        });

        // Auto-dismiss
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }));
        }, TOAST_DURATION);
    },

    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),

    clearAll: () => set({ toasts: [] }),
}));
