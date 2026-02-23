"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { ensureApiUrl } from "@/lib/endpoints";

function ConfirmEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get("email") ?? "";
    const token = searchParams.get("token") ?? "";

    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [verifying, setVerifying] = useState(!!token);
    const [verified, setVerified] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // GSAP entrance
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

    // Auto-verify if token is present in URL
    useEffect(() => {
        if (!token) return;
        const baseUrl = ensureApiUrl();

        async function verify() {
            setVerifying(true);
            try {
                const res = await fetch(`${baseUrl}/auth/verify-email?token=${token}`);
                const data = await res.json();

                if (res.ok) {
                    setVerified(true);
                    // Redirect to login after 3 seconds
                    setTimeout(() => router.push("/login"), 3000);
                } else {
                    setVerifyError(data.error || "Verification failed.");
                }
            } catch {
                setVerifyError("Network error. Please try again.");
            } finally {
                setVerifying(false);
            }
        }

        verify();
    }, [token, router]);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleResend = async () => {
        if (resending || cooldown > 0 || !email) return;
        const baseUrl = ensureApiUrl();
        setResending(true);
        setResent(false);

        try {
            await fetch(`${baseUrl}/auth/resend-verification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            setResent(true);
            setCooldown(60);
        } catch {
            // silently fail
        } finally {
            setResending(false);
        }
    };

    // ─── Token verification view ────────────────────────────

    if (token) {
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
                        <div className="relative bg-surface rounded-2xl p-10 text-center">
                            {verifying ? (
                                <>
                                    <div className="flex justify-center mb-6">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-violet/20 to-accent-teal/10 flex items-center justify-center border border-border">
                                            <svg className="animate-spin w-9 h-9 text-accent-violet" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <h1 className="text-heading font-bold text-text-primary mb-2">Verifying your email…</h1>
                                    <p className="text-body text-text-muted">Please wait a moment.</p>
                                </>
                            ) : verified ? (
                                <>
                                    <div className="flex justify-center mb-6">
                                        <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                                            <CheckCircle2 className="w-9 h-9 text-success" />
                                        </div>
                                    </div>
                                    <h1 className="text-heading font-bold text-text-primary mb-2">Email verified!</h1>
                                    <p className="text-body text-text-muted mb-6">Your account is now active. Redirecting to login…</p>
                                    <Link
                                        href="/login"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent-violet text-white rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] hover:bg-[#6B59E6]"
                                    >
                                        Go to Login
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-center mb-6">
                                        <div className="w-20 h-20 rounded-2xl bg-danger/10 flex items-center justify-center border border-danger/20">
                                            <XCircle className="w-9 h-9 text-danger" />
                                        </div>
                                    </div>
                                    <h1 className="text-heading font-bold text-text-primary mb-2">Verification failed</h1>
                                    <p className="text-body text-text-muted mb-6">{verifyError}</p>
                                    <Link
                                        href="/register"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent-violet text-white rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] hover:bg-[#6B59E6]"
                                    >
                                        Try Again
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── "Check your email" view ────────────────────────────

    return (
        <div
            ref={containerRef}
            className="h-full bg-background flex items-center justify-center px-6 relative overflow-hidden"
        >
            {/* Background orbs */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] bg-accent-violet/[0.06] rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[15%] right-[10%] w-[400px] h-[400px] bg-accent-teal/[0.05] rounded-full blur-[160px] animate-pulse" style={{ animationDelay: "2s" }} />
            </div>

            <div ref={cardRef} className="w-full max-w-[480px] relative z-10 opacity-0">
                {/* Card */}
                <div className="relative">
                    <div className="absolute -inset-[1px] bg-gradient-to-br from-accent-violet/30 via-border to-accent-teal/20 rounded-2xl" />
                    <div className="relative bg-surface rounded-2xl p-10">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-violet/20 to-accent-teal/10 flex items-center justify-center border border-border">
                                <Mail className="w-9 h-9 text-accent-violet" />
                            </div>
                        </div>

                        {/* Heading */}
                        <h1 className="text-heading font-bold text-text-primary text-center mb-2">
                            Check your email
                        </h1>
                        <p className="text-body text-text-muted text-center mb-2">
                            We&apos;ve sent a confirmation link to
                        </p>
                        {email && (
                            <p className="text-body font-semibold text-accent-violet text-center mb-8">
                                {email}
                            </p>
                        )}

                        {/* Instructions */}
                        <div className="bg-background rounded-xl p-5 border border-border mb-6">
                            <h3 className="text-body font-semibold text-text-primary mb-3">
                                What to do next:
                            </h3>
                            <ol className="space-y-2.5">
                                {[
                                    "Open your email inbox",
                                    "Click the confirmation link from Corvus",
                                    "You\u2019ll be redirected to log in",
                                ].map((step, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-violet/10 text-accent-violet text-micro font-bold flex items-center justify-center mt-0.5">
                                            {i + 1}
                                        </span>
                                        <span className="text-body text-text-muted">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Resend button */}
                        <button
                            onClick={handleResend}
                            disabled={resending || cooldown > 0 || !email}
                            className="w-full py-3 bg-surface-raised border border-border text-text-primary rounded-[10px] font-medium text-body transition-all duration-200 hover:bg-hover-row hover:border-accent-violet/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                            {cooldown > 0
                                ? `Resend in ${cooldown}s`
                                : resending
                                    ? "Sending…"
                                    : "Resend confirmation email"}
                        </button>

                        {resent && (
                            <p className="mt-3 text-micro text-success text-center">
                                ✓ Confirmation email resent successfully
                            </p>
                        )}

                        {/* Spam notice */}
                        <p className="mt-4 text-micro text-text-muted text-center">
                            Didn&apos;t receive it? Check your spam folder or try a different email address.
                        </p>
                    </div>
                </div>

                {/* Back to login */}
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

export default function ConfirmEmailPage() {
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
            <ConfirmEmailContent />
        </Suspense>
    );
}
