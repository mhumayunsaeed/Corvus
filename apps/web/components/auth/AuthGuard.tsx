"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/confirm-email"];
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
    const { isAuthenticated, user } = useAuthStore();
    const [isReady, setIsReady] = useState(false);

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

        const isPublic = matchesRoute(pathname, PUBLIC_ROUTES);
        const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);
        const isOnboarding = matchesRoute(pathname, ["/onboarding"]);

        if (!isAuthenticated && !isPublic) {
            // Not logged in, trying to access protected route → redirect to login
            router.replace("/login");
        } else if (isAuthenticated && isAuthRoute) {
            // Already logged in, on login/register → redirect to app or onboarding
            if (user && !user.onboardingCompleted) {
                router.replace("/onboarding");
            } else {
                router.replace("/app");
            }
        } else if (isAuthenticated && isOnboarding && user?.onboardingCompleted) {
            // Onboarding already done → redirect to app
            router.replace("/app");
        }
    }, [isReady, isAuthenticated, user, pathname, router]);

    // Show nothing while hydrating to prevent flash
    if (!isReady) {
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
