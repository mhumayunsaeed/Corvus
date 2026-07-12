"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@corvus/ui";
import { Button } from "./Button";

/**
 * Modal (brief §Modals). No decorative header bar / colored strip — just title,
 * body, action row. Overlay blurs the base background.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []
    );
    requestAnimationFrame(() => (focusable()[0] ?? panelRef.current)?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = focusable();
        if (items.length === 0) {
          e.preventDefault();
          panelRef.current?.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : "Dialog"}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgb(var(--c-background) / 0.7)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "w-[min(480px,calc(100vw-32px))] rounded-xl border border-border bg-surface-overlay p-7 shadow-modal",
          className
        )}
      >
        {title && <h2 id={titleId} className="text-[18px] font-semibold text-text-primary">{title}</h2>}
        {children && <div className="mt-3 text-[14px] leading-[1.6] text-text-secondary">{children}</div>}
        {footer && <div className="mt-6 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Convenience confirm dialog matching the brief's action-row pattern.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  destructive,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body}
    </Modal>
  );
}
