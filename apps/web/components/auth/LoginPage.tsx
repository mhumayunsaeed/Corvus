"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { API_URL } from "@/lib/endpoints";
import { BRAND_MOTTO, BRAND_TAGLINE } from "@/lib/brand";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
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
                appWindow.show().catch(() => { });
                appWindow.setFocus().catch(() => { });
            }).catch(() => { });
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

    const validateLoginForm = () => {
        const normalizedEmail = email.trim();
        let valid = true;

        setEmailError(null);
        setPasswordError(null);

        if (!normalizedEmail) {
            setEmailError("Email is required.");
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setEmailError("Please enter a valid email address.");
            valid = false;
        }

        if (!password) {
            setPasswordError("Password is required.");
            valid = false;
        }

        return valid;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateLoginForm()) {
            return;
        }

        try {
            await login(email.trim(), password);
            // AuthGuard will handle redirect to /app
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
                {/* Large glowing Corvus mark */}
                <div className="relative">
                    <div className="absolute -inset-16 bg-gradient-to-br from-accent-violet/20 to-accent-teal/10 rounded-full blur-[100px]" />
                    <img src="/corvus-logo.png" alt="Corvus" className="relative w-28 h-28 rounded-full shadow-glow" />
                </div>
                <h2 className="mt-10 text-4xl font-bold text-text-primary tracking-tight text-center leading-tight max-w-sm">
                    {BRAND_MOTTO}
                </h2>
                <p className="mt-4 text-text-muted text-center max-w-xs leading-relaxed">
                    {BRAND_TAGLINE}
                </p>

                {/* Feature badges */}
                <div className="mt-10 flex flex-wrap justify-center gap-3 max-w-xs">
                    {["End-to-End Encrypted", "Crystal-Clear Voice", "Low-Latency Calls"].map(
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
                                <img src="/corvus-logo.png" alt="Corvus" className="w-11 h-11 rounded-full shadow-glow" />
                                <span className="text-xl font-bold text-text-primary tracking-tight">
                                    Corvus
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
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (emailError) setEmailError(null);
                                                if (error) setError(null);
                                            }}
                                            onFocus={() => setIsFocused("email")}
                                            onBlur={() => setIsFocused(null)}
                                            className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>
                                    {emailError && (
                                        <p className="mt-2 text-micro text-danger">{emailError}</p>
                                    )}
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
                                        <Link
                                            href="/forgot-password"
                                            className="text-micro text-text-muted hover:text-accent-violet transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
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
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                if (passwordError) setPasswordError(null);
                                                if (error) setError(null);
                                            }}
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
                                    {passwordError && (
                                        <p className="mt-2 text-micro text-danger">{passwordError}</p>
                                    )}
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

                                {/* OAuth */}
                                <div className="grid grid-cols-1 gap-3">
                                    <GoogleSignInButton
                                        label="Sign in with Google"
                                        onError={(msg) => setError(msg)}
                                    />
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

