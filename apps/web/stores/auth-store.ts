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
    checkUsername: (username: string) => Promise<boolean | null>;
    refreshUser: () => Promise<void>;
}

async function api<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const baseUrl = ensureApiUrl();
    let res: Response;
    try {
        res = await fetch(`${baseUrl}${path}`, {
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            ...options,
        });
    } catch {
        throw new Error(
            `Failed to reach API at ${baseUrl}. ` +
            "Check NEXT_PUBLIC_API_URL and backend CORS settings."
        );
    }

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data as T;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (email: string, password: string) => {
                set({ isLoading: true });

                try {
                    const data = await api<{ token: string; user: User }>("/auth/login", {
                        method: "POST",
                        body: JSON.stringify({ email, password }),
                    });

                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (err) {
                    set({ isLoading: false });
                    throw err;
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

                    set({ isLoading: false });

                    return {
                        confirmEmail: result.confirmEmail,
                        email: result.email,
                    };
                } catch (err) {
                    set({ isLoading: false });
                    throw err;
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
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
                    set({ user: { ...current, status } });
                    get().updateUser({ status });
                }
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
            name: "veyra-auth",
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
