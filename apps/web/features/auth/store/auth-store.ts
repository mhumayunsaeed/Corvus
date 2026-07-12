import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ensureApiUrl } from "@/shared/lib/endpoints";
import {
    clearPendingSignupProfile,
    exchangeSupabaseSession,
    getActiveSupabaseSession,
    getPendingSignupProfile,
    savePendingSignupProfile,
    signInWithEmail,
    signInWithGoogle,
    signInWithGithub,
    signOutSupabase,
    signUpWithEmail,
} from "@/features/auth/api/auth";

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
    googleLogin: () => Promise<void>;
    githubLogin: () => Promise<void>;
    register: (data: {
        displayName: string;
        username: string;
        email: string;
        password: string;
    }) => Promise<{ confirmEmail: boolean; email: string }>;
    restoreSession: () => Promise<boolean>;
    logout: () => void;
    updateUser: (data: Partial<User>) => void;
    changeUsername: (username: string) => Promise<void>;
    completeOnboarding: () => Promise<void>;
    setStatus: (status: User["status"]) => void;
    applyPresence: (userId: string, status: User["status"]) => void;
    checkUsername: (username: string) => Promise<boolean | null>;
    refreshUser: () => Promise<void>;
}

interface CustomRequestInit extends RequestInit {
    timeoutMs?: number;
    maxRetries?: number;
}

async function api<T>(
    path: string,
    options: CustomRequestInit = {}
): Promise<T> {
    const baseUrl = ensureApiUrl();
    const method = (options.method || "GET").toUpperCase();
    const maxRetries = options.maxRetries !== undefined
        ? options.maxRetries
        : method === "GET" || method === "HEAD"
          ? 2
          : 0;
    const timeoutMs = options.timeoutMs !== undefined ? options.timeoutMs : 15000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(`${baseUrl}${path}`, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers,
                },
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
                    await signInWithEmail(normalizedEmail, password);

                    const pendingSignup = getPendingSignupProfile(normalizedEmail);
                    const data = await exchangeSupabaseSession(
                        pendingSignup
                            ? {
                                displayName: pendingSignup.displayName,
                                username: pendingSignup.username,
                            }
                            : undefined
                    );

                    if (!data) {
                        throw new Error("Sign-in succeeded, but no Supabase session was returned.");
                    }

                    clearPendingSignupProfile(normalizedEmail);
                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true,
                    });
                } finally {
                    set({ isLoading: false });
                }
            },

            googleLogin: async () => {
                set({ isLoading: true });

                try {
                    // Redirects the browser to Google; the session is finalized
                    // on /auth/callback via restoreSession().
                    await signInWithGoogle();
                } finally {
                    set({ isLoading: false });
                }
            },

            githubLogin: async () => {
                set({ isLoading: true });

                try {
                    // Redirects the browser to GitHub; the session is finalized
                    // on /auth/callback via restoreSession().
                    await signInWithGithub();
                } finally {
                    set({ isLoading: false });
                }
            },

            register: async (data) => {
                set({ isLoading: true });

                try {
                    const normalizedEmail = data.email.trim().toLowerCase();
                    const displayName = data.displayName.trim();
                    const username = data.username.trim().toLowerCase();

                    const { needsConfirmation } = await signUpWithEmail({
                        email: normalizedEmail,
                        password: data.password,
                        displayName,
                    });

                    savePendingSignupProfile({
                        email: normalizedEmail,
                        displayName,
                        username,
                    });

                    // If email confirmation is disabled, Supabase returns a live
                    // session immediately and we can finish sign-in now.
                    if (!needsConfirmation) {
                        const exchanged = await exchangeSupabaseSession({
                            displayName,
                            username,
                        });

                        if (exchanged) {
                            clearPendingSignupProfile(normalizedEmail);
                            set({
                                user: exchanged.user,
                                token: exchanged.token,
                                isAuthenticated: true,
                            });

                            return {
                                confirmEmail: false,
                                email: normalizedEmail,
                            };
                        }
                    }

                    return {
                        confirmEmail: true,
                        email: normalizedEmail,
                    };
                } finally {
                    set({ isLoading: false });
                }
            },

            restoreSession: async () => {
                if (get().token) {
                    return true;
                }

                const session = await getActiveSupabaseSession();
                const email = session?.user?.email?.trim().toLowerCase();

                if (!email) {
                    return false;
                }

                const pendingSignup = getPendingSignupProfile(email);
                const data = await exchangeSupabaseSession(
                    pendingSignup
                        ? {
                            displayName: pendingSignup.displayName,
                            username: pendingSignup.username,
                        }
                        : undefined
                );

                if (!data) {
                    return false;
                }

                clearPendingSignupProfile(email);
                set({
                    user: data.user,
                    token: data.token,
                    isAuthenticated: true,
                });
                return true;
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

                try {
                    void signOutSupabase().catch((err: unknown) => {
                        console.warn("Failed to clear Supabase session:", err);
                    });
                } catch {
                    // Supabase auth not configured in this build.
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

            changeUsername: async (username) => {
                const token = get().token;
                const current = get().user;
                if (!token || !current) {
                    throw new Error("You must be signed in to change your username.");
                }
                const normalized = username.trim().toLowerCase();
                if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalized)) {
                    throw new Error(
                        "Usernames must be 3–30 characters and use only letters, numbers, or underscores."
                    );
                }
                if (normalized === current.username) return;

                const data = await api<{ user: User }>("/auth/profile", {
                    method: "PATCH",
                    body: JSON.stringify({ username: normalized }),
                    headers: { Authorization: `Bearer ${token}` },
                });
                set({ user: data.user });
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
                        timeoutMs: 5000,
                        maxRetries: 0,
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
