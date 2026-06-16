"use client";

import { cn } from "@corvus/ui";
import { X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/shared/stores/toast-store";

/**
 * Toast viewport (brief §Toasts). A 3px left stripe in the semantic color —
 * no icon inside a colored circle. Reads the existing toast-store.
 */
const STRIPE: Record<ToastVariant, string> = {
  success: "var(--status-online)",
  error: "var(--status-dnd)",
  info: "var(--accent)",
  notification: "var(--accent)",
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => removeToast(t.id)}
          className={cn(
            "pointer-events-auto flex min-w-[240px] max-w-[360px] items-start gap-2.5 rounded-md border border-border bg-surface-overlay py-3 pl-4 pr-4 text-left",
            "animate-slide-up shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
          )}
          style={{ borderLeft: `3px solid ${STRIPE[t.variant ?? "notification"]}` }}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium text-text-primary">{t.title}</div>
            {t.body && <div className="mt-0.5 line-clamp-2 text-[13px] text-text-secondary">{t.body}</div>}
          </div>
          <X size={14} className="mt-0.5 shrink-0 text-text-faint" />
        </button>
      ))}
    </div>
  );
}
