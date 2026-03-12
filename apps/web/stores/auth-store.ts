import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ensureApiUrl } from "@/lib/endpoints";

export interface User {
    id: string;
    email: string;
    displayName: string;
    username: string;
    avatar: string | null;
    bio: string | null;
    status: "online" | "idle" | "dnd" | "invisible" | "offline";
    onboardingCompleted: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    googleLogin: (credential: string) => Promise<{ isNewUser: boolean }>;
    register: (data: {
        displayName: string;
        username: string;
        email: string;
        password: string;
    }) => Promise<{ confirmEmail: boolean; email: string }>;
    logout: () => void;
    updateUser: (data: Partial<User>) => void;
    completeOnboarding: () => Promise<void>;
    setStatus: (status: User["status"]) => void;
    applyPresence: (userId: string, status: User["status"]) => void;
    checkUsername: (username: string) => Promise<boolean | null>;
    refreshUser: () => Promise<void>;
}

async function api<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const baseUrl = ensureApiUrl();
    const maxRetries = 2;
    const timeoutMs = 15000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(`${baseUrl}${path}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers,
                },
                ...options,
                signal: controller.signal,
            });

            const contentType = res.headers.get("content-type") || "";
            let data: unknown = null;

            if (contentType.includes("application/json")) {
                data = await res.json().catch(() => null);
            } else {
                const text = await res.text().catch(() => "");
                data = text ? { error: text } : null;
            }

            if (!res.ok) {
                const errObj = data as { error?: string; message?: string; details?: string } | null;
                const baseMessage =
                    errObj?.error ||
                    errObj?.message ||
                    `Request failed (${res.status})`;

                const httpError = new Error(
                    errObj?.details ? `${baseMessage}: ${errObj.details}` : baseMessage
                );
                httpError.name = "HttpError";
                throw httpError;
            }

            return (data ?? ({} as T)) as T;
        } catch (err) {
            const isHttpError = err instanceof Error && err.name === "HttpError";
            if (isHttpError) {
                throw err;
            }

            if (attempt < maxRetries) {
                // Wait before retrying (handles Render cold starts and transient network issues)
                await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
                continue;
            }

            if (err instanceof Error && err.name === "AbortError") {
                throw new Error(
                    `Request to ${baseUrl}${path} timed out. ` +
                    "Please check your connection and try again."
                );
            }

            if (err instanceof Error) {
                throw err;
            }

            throw new Error("Unexpected error.");
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // Unreachable, but satisfies TypeScript
    throw new Error("Unexpected error.");
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (email: string, password: string) => {
                const normalizedEmail = email.trim().toLowerCase();
                if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
                    throw new Error("Please enter a valid email address.");
                }
                if (!password) {
                    throw new Error("Password is required.");
                }

                set({ isLoading: true });

                try {
                    const data = await api<{ token: string; user: User }>("/auth/login", {
                        method: "POST",
                        body: JSON.stringify({ email: normalizedEmail, password }),
                    });

                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true,
                    });
                } finally {
                    set({ isLoading: false });
                }
            },

            googleLogin: async (credential: string) => {
                set({ isLoading: true });

                try {
                    const data = await api<{
                        token: string;
                        user: User;
                        isNewUser: boolean;
                    }>("/auth/google", {
                        method: "POST",
                        body: JSON.stringify({ credential }),
                    });

                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true,
                    });

                    return { isNewUser: data.isNewUser };
                } finally {
                    set({ isLoading: false });
                }
            },

            register: async (data) => {
                set({ isLoading: true });

                try {
                    const result = await api<{
                        confirmEmail: boolean;
                        email: string;
                        message: string;
                    }>("/auth/register", {
                        method: "POST",
                        body: JSON.stringify(data),
                    });

                    return {
                        confirmEmail: result.confirmEmail,
                        email: result.email,
                    };
                } finally {
                    set({ isLoading: false });
                }
            },

            logout: () => {
                const token = get().token;

                // Clear local auth state immediately so the UI redirects
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                });

                // Fire-and-forget: tell the server to set status offline.
                // The WebSocket hook will also close because token became null,
                // which triggers server-side removeClient() -> offline as a fallback.
                if (token) {
                    api("/auth/logout", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                    }).catch((err) => {
                        console.warn("Failed to sync logout presence:", err);
                    });
                }
            },

            updateUser: (data) => {
                const current = get().user;
                const token = get().token;
                if (current) {
                    set({ user: { ...current, ...data } });

                    // Sync to API in background
                    if (token) {
                        const body: Record<string, unknown> = {};
                        if (data.displayName !== undefined) body.displayName = data.displayName;
                        if (data.bio !== undefined) body.bio = data.bio;
                        if (data.avatar !== undefined) body.avatarUrl = data.avatar;
                        if (data.status !== undefined) body.status = data.status;

                        if (Object.keys(body).length > 0) {
                            api("/auth/profile", {
                                method: "PATCH",
                                body: JSON.stringify(body),
                                headers: { Authorization: `Bearer ${token}` },
                            }).catch((err) =>
                                console.error("Failed to sync profile:", err)
                            );
                        }
                    }
                }
            },

            completeOnboarding: async () => {
                const current = get().user;
                const token = get().token;
                if (current) {
                    set({ user: { ...current, onboardingCompleted: true } });

                    if (token) {
                        try {
                            await api("/auth/profile", {
                                method: "PATCH",
                                body: JSON.stringify({ onboardingCompleted: true }),
                                headers: { Authorization: `Bearer ${token}` },
                            });
                        } catch (err) {
                            console.error("Failed to sync onboarding:", err);
                        }
                    }
                }
            },

            setStatus: (status) => {
                const current = get().user;
                if (current) {
                    const nextStatus = status === "offline" ? "invisible" : status;
                    set({ user: { ...current, status: nextStatus } });
                    get().updateUser({ status: nextStatus });
                }
            },

            applyPresence: (userId, status) => {
                set((state) => {
                    if (!state.user || state.user.id !== userId || state.user.status === status) {
                        return state;
                    }
                    return { user: { ...state.user, status } };
                });
            },

            checkUsername: async (username: string): Promise<boolean | null> => {
                try {
                    const data = await api<{ available: boolean }>(
                        `/auth/check-username?username=${encodeURIComponent(username)}`
                    );
                    return data.available;
                } catch (err) {
                    // Network error — don't report username as taken
                    console.warn("Username check failed (API unreachable?):", err);
                    return null;
                }
            },

            refreshUser: async () => {
                const token = get().token;
                if (!token) return;

                try {
                    const data = await api<{ user: User }>("/auth/me", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    set({ user: data.user, isAuthenticated: true });
                } catch {
                    // Token expired or invalid
                    set({ user: null, token: null, isAuthenticated: false });
                }
            },
        }),
        {
            name: "corvus-auth",
            storage: createJSONStorage(() => {
                // Use localStorage on web, will integrate with Tauri secure storage later
                if (typeof window !== "undefined") {
                    return localStorage;
                }
                return {
                    getItem: () => null,
                    setItem: () => { },
                    removeItem: () => { },
                };
            }),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
