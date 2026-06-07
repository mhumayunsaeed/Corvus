import { useToastStore, type ToastVariant } from "@/stores/toast-store";

/**
 * Non-blocking, app-styled toasts — a drop-in replacement for `alert()` that
 * doesn't freeze the UI thread. Safe to call from anywhere (event handlers,
 * catch blocks); reads the store imperatively.
 */
function push(variant: ToastVariant, title: string, body: string) {
    useToastStore.getState().addToast({ variant, title, body });
}

export function notifyError(message: string, title = "Something went wrong") {
    push("error", title, message);
}

export function notifySuccess(message: string, title = "Done") {
    push("success", title, message);
}

export function notifyInfo(message: string, title = "Heads up") {
    push("info", title, message);
}
