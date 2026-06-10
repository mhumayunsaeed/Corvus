"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { getActiveSupabaseSession, updatePassword } from "@/lib/auth";

function ResetPasswordContent() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isFocused, setIsFocused] = useState<string | null>(null);
    // null = checking for the recovery session established by the email link
    const [hasSession, setHasSession] = useState<boolean | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // The password-reset email link redirects here and establishes a temporary
    // Supabase recovery session (handled by detectSessionInUrl).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const session = await getActiveSupabaseSession();
            if (!cancelled) setHasSession(Boolean(session));
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let ctx: { revert: () => void } | undefined;
        async function animate() {
            const gsapModule = await import("gsap");
            const gsap = gsapModule.default;
            ctx = gsap.context(() => {
                gsap.fromTo(
                    cardRef.current,
                    { opacity: 0, y: 30, scale: 0.98 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" }
                );
            }, containerRef);
        }
        animate();
        return () => ctx?.revert();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await updatePassword(password);

            setSuccess(true);
            setTimeout(() => router.push("/login"), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Still checking whether the email link established a recovery session
    if (hasSession === null) {
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

    // No valid recovery session (link missing, expired, or already used)
    if (hasSession === false) {
        return (
            <div
                ref={containerRef}
                className="h-full bg-background flex items-center justify-center px-6 relative overflow-hidden"
            >
                <div className="absolute inset-0 pointer-events-none" aria-hidden>
                    <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] bg-accent-violet/[0.06] rounded-full blur-[180px] animate-pulse" />
                </div>

                <div ref={cardRef} className="w-full max-w-[480px] relative z-10 opacity-0">
                    <div className="relative">
                        <div className="absolute -inset-[1px] bg-gradient-to-br from-accent-violet/30 via-border to-accent-teal/20 rounded-2xl" />
                        <div className="relative bg-surface rounded-2xl p-10 text-center">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 rounded-2xl bg-danger/10 flex items-center justify-center border border-danger/20">
                                    <XCircle className="w-9 h-9 text-danger" />
                                </div>
                            </div>
                            <h1 className="text-heading font-bold text-text-primary mb-2">Invalid link</h1>
                            <p className="text-body text-text-muted mb-6">
                                This password reset link is invalid or has been used already.
                            </p>
                            <Link
                                href="/forgot-password"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-violet text-on-accent rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(232,163,61,0.35)] hover:bg-[#C9862B]"
                            >
                                Request a new link
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="h-full bg-background flex items-center justify-center px-6 relative overflow-hidden"
        >
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] bg-accent-violet/[0.06] rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[15%] right-[10%] w-[400px] h-[400px] bg-accent-teal/[0.05] rounded-full blur-[160px] animate-pulse" style={{ animationDelay: "2s" }} />
            </div>

            <div ref={cardRef} className="w-full max-w-[480px] relative z-10 opacity-0">
                <div className="relative">
                    <div className="absolute -inset-[1px] bg-gradient-to-br from-accent-violet/30 via-border to-accent-teal/20 rounded-2xl" />
                    <div className="relative bg-surface rounded-2xl p-10">
                        {success ? (
                            <>
                                <div className="flex justify-center mb-6">
                                    <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                                        <CheckCircle2 className="w-9 h-9 text-success" />
                                    </div>
                                </div>
                                <h1 className="text-heading font-bold text-text-primary text-center mb-2">
                                    Password reset!
                                </h1>
                                <p className="text-body text-text-muted text-center mb-6">
                                    Your password has been updated. Redirecting to login…
                                </p>
                                <Link
                                    href="/login"
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-violet text-on-accent rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(232,163,61,0.35)] hover:bg-[#C9862B]"
                                >
                                    Go to Login
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-center mb-6">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-violet/20 to-accent-teal/10 flex items-center justify-center border border-border">
                                        <KeyRound className="w-9 h-9 text-accent-violet" />
                                    </div>
                                </div>

                                <h1 className="text-heading font-bold text-text-primary text-center mb-2">
                                    Set a new password
                                </h1>
                                <p className="text-body text-text-muted text-center mb-8">
                                    Choose a strong password for your account.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* New Password */}
                                    <div>
                                        <label
                                            htmlFor="new-password"
                                            className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider"
                                        >
                                            New Password
                                        </label>
                                        <div
                                            className={`relative rounded-[10px] transition-shadow duration-200 ${
                                                isFocused === "password"
                                                    ? "shadow-[0_0_0_2px_#E8A33D,0_0_20px_rgba(232,163,61,0.15)]"
                                                    : ""
                                            }`}
                                        >
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                id="new-password"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    if (error) setError(null);
                                                }}
                                                onFocus={() => setIsFocused("password")}
                                                onBlur={() => setIsFocused(null)}
                                                className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors pr-12"
                                                placeholder="At least 8 characters"
                                                required
                                                minLength={8}
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

                                    {/* Confirm Password */}
                                    <div>
                                        <label
                                            htmlFor="confirm-password"
                                            className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider"
                                        >
                                            Confirm Password
                                        </label>
                                        <div
                                            className={`relative rounded-[10px] transition-shadow duration-200 ${
                                                isFocused === "confirm"
                                                    ? "shadow-[0_0_0_2px_#E8A33D,0_0_20px_rgba(232,163,61,0.15)]"
                                                    : ""
                                            }`}
                                        >
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                id="confirm-password"
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    if (error) setError(null);
                                                }}
                                                onFocus={() => setIsFocused("confirm")}
                                                onBlur={() => setIsFocused(null)}
                                                className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors"
                                                placeholder="Repeat your password"
                                                required
                                                minLength={8}
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 rounded-[10px] bg-danger/10 border border-danger/20 text-danger text-micro">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-accent-violet text-on-accent rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(232,163,61,0.35)] hover:bg-[#C9862B] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Resetting…
                                            </span>
                                        ) : (
                                            "Reset Password"
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="h-full bg-background flex items-center justify-center">
                    <img
                        src="/corvus-logo.png"
                        alt="Corvus"
                        className="w-10 h-10 rounded-full shadow-glow animate-pulse"
                    />
                </div>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    );
}
