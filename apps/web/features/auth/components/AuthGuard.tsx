"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/features/auth/store/auth-store";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/confirm-email", "/forgot-password", "/reset-password", "/auth/callback", "/spaces/demo", "/setup", "/admin", "/changelog"];
const PUBLIC_PREFIXES = ["/spaces/demo/", "/admin/", "/product/", "/developers/", "/legal/"]; // app shell · admin panel · marketing pages
const AUTH_ROUTES = ["/login", "/register"]; // redirect away if already logged in

/** Check if pathname matches any route in the list (handles trailing slashes) */
function matchesRoute(pathname: string, routes: string[]): boolean {
    const normalized = pathname.endsWith("/") && pathname.length > 1
        ? pathname.slice(0, -1)
        : pathname;
    return routes.includes(normalized);
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, user, token, refreshUser, restoreSession } = useAuthStore();
    const [isReady, setIsReady] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);

    useEffect(() => {
        // Wait for Zustand to hydrate from localStorage
        const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
            setIsReady(true);
        });

        // If already hydrated
        if (useAuthStore.persist.hasHydrated()) {
            setIsReady(true);
        }

        return () => {
            unsubFinishHydration();
        };
    }, []);

    useEffect(() => {
        if (!isReady) return;
        let cancelled = false;

        (async () => {
            if (token) {
                await refreshUser().catch(() => {
                    // refreshUser already handles invalid token state reset
                });
            } else {
                await restoreSession().catch(() => {
                    // No Supabase session to recover.
                });
            }
            if (!cancelled) {
                setSessionChecked(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isReady, token, refreshUser, restoreSession]);

    useEffect(() => {
        if (!isReady || !sessionChecked) return;

        const isPublic =
            matchesRoute(pathname, PUBLIC_ROUTES) ||
            PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
        const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);

        if (!isAuthenticated && !isPublic) {
            // Not logged in, trying to access protected route → redirect to login
            router.replace("/login");
        } else if (isAuthenticated && isAuthRoute) {
            // Already logged in, on login/register → redirect to app
            router.replace("/spaces");
        }
    }, [isReady, sessionChecked, isAuthenticated, user, pathname, router]);

    // Show nothing while hydrating to prevent flash
    if (!isReady || !sessionChecked) {
        return (
            <div className="h-full bg-background flex items-center justify-center">
                <img
                    src="/corvus-logo.png"
                    alt="Corvus"
                    className="w-10 h-10 rounded-full shadow-glow animate-pulse"
                />
            </div>
        );
    }

    return <>{children}</>;
}
