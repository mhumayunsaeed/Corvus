"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential: string }) => void;
                        auto_select?: boolean;
                    }) => void;
                    renderButton: (
                        element: HTMLElement,
                        config: {
                            type?: string;
                            theme?: string;
                            size?: string;
                            width?: number;
                            text?: string;
                            shape?: string;
                            logo_alignment?: string;
                        }
                    ) => void;
                };
            };
        };
    }
}

interface GoogleSignInButtonProps {
    label?: string;
    onError?: (error: string) => void;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const GoogleIcon = () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export function GoogleSignInButton({ label = "Continue with Google", onError }: GoogleSignInButtonProps) {
    const hiddenRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { googleLogin } = useAuthStore();
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCredentialResponse = useCallback(
        async (response: { credential: string }) => {
            setLoading(true);
            try {
                // Close any Tauri popup windows (Google OAuth window)
                if ("__TAURI_INTERNALS__" in window) {
                    try {
                        const { getAllWindows } = await import("@tauri-apps/api/window");
                        const allWindows = await getAllWindows();
                        for (const win of allWindows) {
                            if (win.label.startsWith("popup-")) {
                                await win.close();
                            }
                        }
                    } catch {
                        // Not in Tauri or window API unavailable — ignore
                    }
                }

                await googleLogin(response.credential);
                router.push("/app");
            } catch (err) {
                onError?.(
                    err instanceof Error ? err.message : "Google sign-in failed."
                );
            } finally {
                setLoading(false);
            }
        },
        [googleLogin, router, onError]
    );

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || ready) return;

        function tryInit() {
            if (!window.google || !hiddenRef.current) return false;

            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
            });

            // Render the real Google button into a hidden container.
            // We overlay it invisibly on top of our styled button so the
            // click lands on Google's iframe (required by their ToS).
            window.google.accounts.id.renderButton(hiddenRef.current, {
                type: "standard",
                theme: "outline",
                size: "large",
                width: 400,
                text: "continue_with",
            });

            setReady(true);
            return true;
        }

        if (!tryInit()) {
            const interval = setInterval(() => {
                if (tryInit()) clearInterval(interval);
            }, 200);
            const timeout = setTimeout(() => clearInterval(interval), 5000);
            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [handleCredentialResponse, ready]);

    const disabled = !GOOGLE_CLIENT_ID || loading;

    return (
        <div className="relative w-full">
            {/* Our custom styled button (visible) */}
            <button
                type="button"
                disabled={disabled}
                className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-surface-raised hover:bg-hover-row border border-border rounded-[10px] transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-raised"
            >
                {loading ? (
                    <svg className="animate-spin h-[18px] w-[18px] text-text-muted" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : (
                    <GoogleIcon />
                )}
                <span className="text-sm font-medium text-text-primary group-hover:text-white transition-colors">
                    {loading ? "Signing in..." : label}
                </span>
            </button>

            {/* Invisible Google button overlaid on top — captures the actual click */}
            {GOOGLE_CLIENT_ID && (
                <div
                    ref={hiddenRef}
                    className="absolute inset-0 overflow-hidden opacity-0 [&_iframe]:!h-full [&_iframe]:!w-full [&>div]:!h-full [&>div]:!w-full"
                    style={{ pointerEvents: ready ? "auto" : "none" }}
                    aria-hidden
                />
            )}
        </div>
    );
}
