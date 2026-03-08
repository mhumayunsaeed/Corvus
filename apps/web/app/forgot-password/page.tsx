"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { ensureApiUrl } from "@/lib/endpoints";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

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

        const trimmed = email.trim();
        if (!trimmed) {
            setError("Email is required.");
            return;
        }

        setLoading(true);
        try {
            const baseUrl = ensureApiUrl();
            const res = await fetch(`${baseUrl}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: trimmed }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong.");
                return;
            }

            setSent(true);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

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
                        {sent ? (
                            <>
                                <div className="flex justify-center mb-6">
                                    <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                                        <CheckCircle2 className="w-9 h-9 text-success" />
                                    </div>
                                </div>
                                <h1 className="text-heading font-bold text-text-primary text-center mb-2">
                                    Check your email
                                </h1>
                                <p className="text-body text-text-muted text-center mb-6">
                                    If an account with that email exists, we&apos;ve sent a password reset link.
                                    Check your inbox and spam folder.
                                </p>
                                <Link
                                    href="/login"
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-violet text-white rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] hover:bg-[#6B59E6]"
                                >
                                    Back to Login
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-center mb-6">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-violet/20 to-accent-teal/10 flex items-center justify-center border border-border">
                                        <Mail className="w-9 h-9 text-accent-violet" />
                                    </div>
                                </div>

                                <h1 className="text-heading font-bold text-text-primary text-center mb-2">
                                    Forgot your password?
                                </h1>
                                <p className="text-body text-text-muted text-center mb-8">
                                    Enter your email and we&apos;ll send you a link to reset it.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label
                                            htmlFor="reset-email"
                                            className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider"
                                        >
                                            Email
                                        </label>
                                        <div
                                            className={`relative rounded-[10px] transition-shadow duration-200 ${
                                                isFocused
                                                    ? "shadow-[0_0_0_2px_#7C6AF7,0_0_20px_rgba(124,106,247,0.15)]"
                                                    : ""
                                            }`}
                                        >
                                            <input
                                                type="email"
                                                id="reset-email"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    if (error) setError(null);
                                                }}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors"
                                                placeholder="you@example.com"
                                                required
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
                                        className="w-full py-3 bg-accent-violet text-white rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] hover:bg-[#6B59E6] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Sending…
                                            </span>
                                        ) : (
                                            "Send Reset Link"
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
