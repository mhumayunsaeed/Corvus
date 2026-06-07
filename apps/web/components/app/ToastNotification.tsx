"use client";

import { useEffect, useRef } from "react";
import { X, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useToastStore, type Toast } from "@/stores/toast-store";
import { useAppStore } from "@/stores/app-store";
import { useNotificationStore } from "@/stores/notification-store";
import { UserAvatar } from "./UserAvatar";

export function ToastContainer() {
    const toasts = useToastStore((s) => s.toasts);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[90] flex flex-col-reverse gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <ToastCard key={toast.id} toast={toast} />
            ))}
        </div>
    );
}

const VARIANT_META = {
    error: { Icon: AlertTriangle, tone: "text-danger", bg: "bg-danger/12 border-danger/25" },
    success: { Icon: CheckCircle2, tone: "text-success", bg: "bg-success/12 border-success/25" },
    info: { Icon: Info, tone: "text-accent", bg: "bg-accent-soft border-accent/25" },
} as const;

function ToastCard({ toast }: { toast: Toast }) {
    const removeToast = useToastStore((s) => s.removeToast);
    const setActiveServer = useAppStore((s) => s.setActiveServer);
    const setActiveChannel = useAppStore((s) => s.setActiveChannel);
    const setActiveDMConversation = useAppStore((s) => s.setActiveDMConversation);
    const markChannelRead = useNotificationStore((s) => s.markChannelRead);
    const markDMRead = useNotificationStore((s) => s.markDMRead);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let ctx: { revert: () => void } | undefined;
        async function animate() {
            const gsapModule = await import("gsap");
            const gsap = gsapModule.default;
            ctx = gsap.context(() => {
                gsap.fromTo(
                    cardRef.current,
                    { x: 120, opacity: 0 },
                    { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
                );
            });
        }
        animate();
        return () => ctx?.revert();
    }, []);

    const isMessageVariant =
        !toast.variant || toast.variant === "notification";

    const handleClick = () => {
        if (!isMessageVariant) return; // status toasts are not navigable
        if (toast.channelId && toast.serverId) {
            setActiveServer(toast.serverId);
            setTimeout(() => {
                setActiveChannel(toast.channelId!);
                markChannelRead(toast.channelId!);
            }, 50);
        } else if (toast.conversationId) {
            setActiveDMConversation(toast.conversationId);
            markDMRead(toast.conversationId);
        }
        removeToast(toast.id);
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (cardRef.current) {
            import("gsap").then(({ default: gsap }) => {
                gsap.to(cardRef.current, {
                    x: 120,
                    opacity: 0,
                    duration: 0.2,
                    onComplete: () => removeToast(toast.id),
                });
            });
        } else {
            removeToast(toast.id);
        }
    };

    const statusMeta =
        !isMessageVariant && toast.variant
            ? VARIANT_META[toast.variant as keyof typeof VARIANT_META]
            : null;

    return (
        <div
            ref={cardRef}
            onClick={handleClick}
            className={`w-[360px] bg-surface-overlay border border-border-highlight rounded-xl shadow-e2 p-3 flex items-start gap-3 transition-colors pointer-events-auto opacity-0 ${isMessageVariant ? "cursor-pointer hover:bg-hover-row" : ""}`}
        >
            {statusMeta ? (
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${statusMeta.bg}`}>
                    <statusMeta.Icon className={`h-[18px] w-[18px] ${statusMeta.tone}`} />
                </div>
            ) : (
                <UserAvatar
                    avatarUrl={toast.avatarUrl}
                    username={toast.title}
                    className="w-9 h-9 flex-shrink-0"
                />
            )}
            <div className="flex-1 min-w-0">
                <div className="text-micro font-semibold text-text-primary truncate">
                    {toast.title}
                </div>
                <div className={`text-micro text-text-muted ${isMessageVariant ? "truncate" : "line-clamp-3"}`}>
                    {toast.body}
                </div>
            </div>
            <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded text-text-muted hover:text-text-primary transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
