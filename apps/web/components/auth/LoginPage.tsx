"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Github, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { API_URL } from "@/lib/endpoints";

export function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isFocused, setIsFocused] = useState<string | null>(null);
    const [isTauri, setIsTauri] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { login, isLoading } = useAuthStore();

    useEffect(() => {
        const w = window as unknown as Record<string, unknown>;
        const detected =
            typeof window !== "undefined" &&
            (("__TAURI__" in window && w.__TAURI__ !== undefined) ||
                ("__TAURI_INTERNALS__" in window && w.__TAURI_INTERNALS__ !== undefined));
        setIsTauri(detected);

        // Show the window once login page is rendered (window starts hidden to prevent white flash)
        if (detected) {
            import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
                const appWindow = getCurrentWindow();
                appWindow.show().catch(() => {});
                appWindow.setFocus().catch(() => {});
            }).catch(() => {});
        }
    }, []);

    useEffect(() => {
        if (!API_URL) return;
        const controller = new AbortController();

        fetch(`${API_URL}/healthz`, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
        }).catch(() => {
            // Best-effort warmup for cold starts.
        });

        return () => {
            controller.abort();
        };
    }, []);

    // refs for staggered GSAP entrance
    const containerRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const socialRef = useRef<HTMLDivElement>(null);
    const decorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let ctx: { revert: () => void } | undefined;
        async function animate() {
            const gsapModule = await import("gsap");
            const gsap = gsapModule.default;

            ctx = gsap.context(() => {
                const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

                // Decorative panel fade
                tl.fromTo(
                    decorRef.current,
                    { opacity: 0, x: -40 },
                    { opacity: 1, x: 0, duration: 0.8 }
                );

                // Logo
                tl.fromTo(
                    logoRef.current,
                    { opacity: 0, y: 16 },
                    { opacity: 1, y: 0, duration: 0.5 },
                    "-=0.4"
                );

                // Heading block
                tl.fromTo(
                    headingRef.current,
                    { opacity: 0, y: 16 },
                    { opacity: 1, y: 0, duration: 0.5 },
                    "-=0.3"
                );

                // Form fields stagger
                if (formRef.current) {
                    tl.fromTo(
                        formRef.current.children,
                        { opacity: 0, y: 12 },
                        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 },
                        "-=0.25"
                    );
                }

                // Social section
                tl.fromTo(
                    socialRef.current,
                    { opacity: 0, y: 12 },
                    { opacity: 1, y: 0, duration: 0.45 },
                    "-=0.15"
                );
            }, containerRef);
        }
        animate();
        return () => ctx?.revert();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await login(email, password);
            // AuthGuard will handle redirect to /app or /onboarding
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Invalid email or password. Please try again."
            );
        }
    };

    return (
        <div
            ref={containerRef}
            className="h-full bg-background flex relative overflow-y-auto overflow-x-hidden"
        >
            {/* ─── Animated background orbs ─── */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="absolute top-[15%] left-[10%] w-[540px] h-[540px] bg-accent-violet/[0.06] rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[5%] w-[420px] h-[420px] bg-accent-teal/[0.05] rounded-full blur-[160px] animate-pulse" style={{ animationDelay: "2s" }} />
                <div className="absolute top-[60%] left-[50%] w-[300px] h-[300px] bg-accent-violet/[0.04] rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "4s" }} />
            </div>

            {/* ─── Left decorative panel (desktop only) ─── */}
            <div
                ref={decorRef}
                className="hidden lg:flex flex-col justify-center items-center w-[48%] relative opacity-0"
            >
                {/* Large glowing Veyra mark */}
                <div className="relative">
                    <div className="absolute -inset-16 bg-gradient-to-br from-accent-violet/20 to-accent-teal/10 rounded-full blur-[100px]" />
                    <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-accent-violet to-accent-teal flex items-center justify-center shadow-glow">
                        <span className="text-white font-bold text-5xl tracking-tight">V</span>
                    </div>
                </div>
                <h2 className="mt-10 text-4xl font-bold text-text-primary tracking-tight text-center leading-tight max-w-sm">
                    Where your world<br />
                    <span className="bg-gradient-to-r from-accent-violet to-accent-teal bg-clip-text text-transparent">
                        connects.
                    </span>
                </h2>
                <p className="mt-4 text-text-muted text-center max-w-xs leading-relaxed">
                    Voice, video, and real-time chat — in a faster, cleaner, and more private space.
                </p>

                {/* Feature badges */}
                <div className="mt-10 flex flex-wrap justify-center gap-3 max-w-xs">
                    {["End-to-End Encrypted", "Crystal-Clear Voice", "Offline Ready"].map(
                        (feature) => (
                            <span
                                key={feature}
                                className="px-3.5 py-1.5 text-micro text-text-muted bg-surface/60 border border-border rounded-full backdrop-blur-sm"
                            >
                                {feature}
                            </span>
                        )
                    )}
                </div>
            </div>

            {/* ─── Right form panel ─── */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
                <div className="w-full max-w-[420px]">
                    {/* Glass card */}
                    <div className="relative">
                        {/* Card glow */}
                        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-accent-violet/20 via-transparent to-accent-teal/10 opacity-60" />
                        <div className="relative bg-surface/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl shadow-black/20">
                            {/* Logo (mobile) */}
                            <div ref={logoRef} className="flex items-center justify-center gap-3 mb-8 opacity-0">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-violet to-accent-teal flex items-center justify-center shadow-glow">
                                    <span className="text-white font-bold text-lg">V</span>
                                </div>
                                <span className="text-xl font-bold text-text-primary tracking-tight">
                                    Veyra
                                </span>
                            </div>

                            {/* Heading */}
                            <div ref={headingRef} className="text-center mb-8 opacity-0">
                                <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
                                <p className="text-text-muted text-sm mt-1.5">
                                    Log in to continue your journey
                                </p>
                            </div>

                            {/* Form */}
                            <form ref={formRef} onSubmit={handleLogin} className="space-y-5">
                                {/* Email */}
                                <div className="opacity-0">
                                    <label
                                        htmlFor="login-email"
                                        className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider"
                                    >
                                        Email
                                    </label>
                                    <div
                                        className={`relative rounded-[10px] transition-shadow duration-200 ${isFocused === "email"
                                            ? "shadow-[0_0_0_2px_#7C6AF7,0_0_20px_rgba(124,106,247,0.15)]"
                                            : ""
                                            }`}
                                    >
                                        <input
                                            type="email"
                                            id="login-email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setIsFocused("email")}
                                            onBlur={() => setIsFocused(null)}
                                            className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="opacity-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <label
                                            htmlFor="login-password"
                                            className="block text-micro font-medium text-text-muted uppercase tracking-wider"
                                        >
                                            Password
                                        </label>
                                        <a
                                            href="#"
                                            className="text-micro text-text-muted hover:text-accent-violet transition-colors"
                                        >
                                            Forgot password?
                                        </a>
                                    </div>
                                    <div
                                        className={`relative rounded-[10px] transition-shadow duration-200 ${isFocused === "password"
                                            ? "shadow-[0_0_0_2px_#7C6AF7,0_0_20px_rgba(124,106,247,0.15)]"
                                            : ""
                                            }`}
                                    >
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="login-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setIsFocused("password")}
                                            onBlur={() => setIsFocused(null)}
                                            className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors pr-12"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-[18px] h-[18px]" />
                                            ) : (
                                                <Eye className="w-[18px] h-[18px]" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Error message */}
                                {error && (
                                    <div className="p-3 rounded-[10px] bg-danger/10 border border-danger/20 text-danger text-micro">
                                        {error}
                                    </div>
                                )}

                                {/* Login Button */}
                                <div className="opacity-0 pt-1">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-3 bg-accent-violet text-white rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] hover:bg-[#6B59E6] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                Logging in…
                                            </span>
                                        ) : (
                                            "Log In"
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Divider */}
                            <div ref={socialRef} className="opacity-0">
                                <div className="flex items-center gap-4 my-7">
                                    <div className="flex-1 h-px bg-border" />
                                    <span className="text-micro text-text-muted whitespace-nowrap">
                                        or continue with
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>

                                {/* OAuth — horizontal on desktop, stacked on small */}
                                <div className="grid grid-cols-3 gap-3">
                                    <button className="flex items-center justify-center gap-2 py-2.5 bg-surface-raised hover:bg-hover-row border border-border rounded-[10px] transition-all group">
                                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    </button>

                                    <button className="flex items-center justify-center gap-2 py-2.5 bg-surface-raised hover:bg-hover-row border border-border rounded-[10px] transition-all group">
                                        <Github className="w-[18px] h-[18px] text-text-primary" />
                                    </button>

                                    <button className="flex items-center justify-center gap-2 py-2.5 bg-surface-raised hover:bg-hover-row border border-border rounded-[10px] transition-all group">
                                        <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Register link */}
                                <div className="mt-7 text-center text-sm">
                                    <span className="text-text-muted">Don&apos;t have an account? </span>
                                    <Link
                                        href="/register"
                                        className="text-accent-violet hover:text-[#6B59E6] font-medium transition-colors"
                                    >
                                        Register
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Back to Home — hidden in desktop app */}
                    {!isTauri && (
                        <div className="mt-6 text-center">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors group"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                                Back to home
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
