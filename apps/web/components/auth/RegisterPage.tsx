"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, X, ArrowLeft, Shield } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { BRAND_MOTTO, BRAND_TAGLINE } from "@/lib/brand";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        displayName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isFocused, setIsFocused] = useState<string | null>(null);
    const [isTauri, setIsTauri] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { register, isLoading, checkUsername } = useAuthStore();
    const usernameTimer = useRef<ReturnType<typeof setTimeout>>(null);

    useEffect(() => {
        const w = window as unknown as Record<string, unknown>;
        setIsTauri(
            typeof window !== "undefined" &&
            (("__TAURI__" in window && w.__TAURI__ !== undefined) ||
                ("__TAURI_INTERNALS__" in window && w.__TAURI_INTERNALS__ !== undefined))
        );
    }, []);

    // GSAP entrance
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let ctx: { revert: () => void } | undefined;
        async function animate() {
            const gsapModule = await import("gsap");
            const gsap = gsapModule.default;
            ctx = gsap.context(() => {
                const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
                tl.fromTo(
                    cardRef.current,
                    { opacity: 0, y: 30, scale: 0.98 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.7 }
                );
            }, containerRef);
        }
        animate();
        return () => ctx?.revert();
    }, []);

    const handleUsernameChange = (value: string) => {
        setFormData({ ...formData, username: value });
        if (usernameTimer.current) clearTimeout(usernameTimer.current);
        if (value.length >= 3 && /^[a-zA-Z0-9_]+$/.test(value)) {
            setUsernameAvailable(null); // loading state
            usernameTimer.current = setTimeout(async () => {
                const available = await checkUsername(value.toLowerCase());
                setUsernameAvailable(available);
            }, 500);
        } else {
            setUsernameAvailable(null);
        }
    };

    const passwordsMatch =
        formData.password &&
        formData.confirmPassword &&
        formData.password === formData.confirmPassword;
    const passwordsDontMatch =
        formData.password &&
        formData.confirmPassword &&
        formData.password !== formData.confirmPassword;

    // Strength meter
    const getPasswordStrength = () => {
        const p = formData.password;
        if (!p) return 0;
        let score = 0;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        return score;
    };
    const strength = getPasswordStrength();
    const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
    const strengthColors = ["", "#F75F6E", "#F59E0B", "#3ECF8E", "#3ECFCF"];

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreedToTerms) return;
        if (passwordsDontMatch) {
            setError("Passwords do not match.");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (usernameAvailable === false) {
            setError("Username is already taken.");
            return;
        }
        setError(null);
        try {
            const result = await register({
                displayName: formData.displayName,
                username: formData.username.toLowerCase(),
                email: formData.email,
                password: formData.password,
            });
            if (result.confirmEmail) {
                router.push(`/confirm-email?email=${encodeURIComponent(formData.email)}`);
            } else {
                router.push("/onboarding");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Registration failed. Please try again."
            );
        }
    };

    const focusRing = (field: string) =>
        isFocused === field
            ? "shadow-[0_0_0_2px_#7C6AF7,0_0_20px_rgba(124,106,247,0.15)]"
            : "";

    return (
        <div
            ref={containerRef}
            className="h-full bg-background flex relative overflow-y-auto overflow-x-hidden"
        >
            {/* Background orbs */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="absolute top-[15%] left-[10%] w-[540px] h-[540px] bg-accent-violet/[0.06] rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[5%] w-[420px] h-[420px] bg-accent-teal/[0.05] rounded-full blur-[160px] animate-pulse" style={{ animationDelay: "2s" }} />
            </div>

            {/* Left decorative panel (desktop) */}
            <div className="hidden lg:flex flex-col justify-center items-center w-[46%] relative flex-shrink-0">
                <div className="relative">
                    <div className="absolute -inset-20 bg-gradient-to-br from-accent-violet/20 to-accent-teal/10 rounded-full blur-[120px]" />
                    <img src="/corvus-logo.png" alt="Corvus" className="relative w-24 h-24 rounded-full shadow-glow" />
                </div>
                <h2 className="mt-10 text-4xl font-bold text-text-primary tracking-tight text-center leading-tight max-w-sm">
                    {BRAND_MOTTO}
                </h2>
                <p className="mt-4 text-text-muted text-center max-w-xs leading-relaxed">
                    {BRAND_TAGLINE}
                </p>

                {/* Trust badges */}
                <div className="mt-10 flex flex-col gap-3">
                    {[
                        { icon: Shield, text: "No phone number required" },
                        { icon: Shield, text: "Privacy-first by design" },
                        { icon: Shield, text: "Open-source client" },
                    ].map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-center gap-3 text-sm text-text-muted">
                            <div className="w-8 h-8 rounded-lg bg-accent-violet/10 flex items-center justify-center">
                                <Icon className="w-4 h-4 text-accent-violet" />
                            </div>
                            {text}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex flex-col items-center px-6 py-8 lg:px-16 overflow-y-auto">
                <div className="flex-1" />
                <div ref={cardRef} className="w-full max-w-[440px] opacity-0">
                    {/* Glowing border wrapper */}
                    <div className="relative">
                        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-accent-violet/20 via-transparent to-accent-teal/10 opacity-60" />
                        <div className="relative bg-surface/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl shadow-black/20">
                            {/* Logo */}
                            <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
                                <img src="/corvus-logo.png" alt="Corvus" className="w-11 h-11 rounded-full shadow-glow" />
                                <span className="text-xl font-bold text-text-primary tracking-tight">Corvus</span>
                            </div>

                            <div className="text-center mb-7">
                                <h2 className="text-2xl font-bold text-text-primary">Create an account</h2>
                                <p className="text-text-muted text-sm mt-1.5">Join the community today</p>
                            </div>

                            <form onSubmit={handleRegister} className="space-y-4">
                                {/* Display Name */}
                                <div>
                                    <label htmlFor="reg-displayName" className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                        Display Name
                                    </label>
                                    <div className={`rounded-[10px] transition-shadow duration-200 ${focusRing("displayName")}`}>
                                        <input
                                            type="text"
                                            id="reg-displayName"
                                            value={formData.displayName}
                                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                            onFocus={() => setIsFocused("displayName")}
                                            onBlur={() => setIsFocused(null)}
                                            className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors"
                                            placeholder="Your Name"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Username */}
                                <div>
                                    <label htmlFor="reg-username" className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                        Username
                                    </label>
                                    <div className={`relative rounded-[10px] transition-shadow duration-200 ${focusRing("username")}`}>
                                        <input
                                            type="text"
                                            id="reg-username"
                                            value={formData.username}
                                            onChange={(e) => handleUsernameChange(e.target.value)}
                                            onFocus={() => setIsFocused("username")}
                                            onBlur={() => setIsFocused(null)}
                                            className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors pr-11"
                                            placeholder="@username"
                                            required
                                        />
                                        {usernameAvailable !== null && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {usernameAvailable ? (
                                                    <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                                                        <Check className="w-3.5 h-3.5 text-success" />
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-danger/20 flex items-center justify-center">
                                                        <X className="w-3.5 h-3.5 text-danger" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {usernameAvailable === false && (
                                        <p className="text-micro text-danger mt-1 flex items-center gap-1">
                                            <X className="w-3 h-3" /> Username is already taken
                                        </p>
                                    )}
                                    {usernameAvailable === true && (
                                        <p className="text-micro text-success mt-1 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Username is available
                                        </p>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="reg-email" className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                        Email
                                    </label>
                                    <div className={`rounded-[10px] transition-shadow duration-200 ${focusRing("email")}`}>
                                        <input
                                            type="email"
                                            id="reg-email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            onFocus={() => setIsFocused("email")}
                                            onBlur={() => setIsFocused(null)}
                                            className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label htmlFor="reg-password" className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                        Password
                                    </label>
                                    <div className={`relative rounded-[10px] transition-shadow duration-200 ${focusRing("password")}`}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="reg-password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                                            {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                        </button>
                                    </div>
                                    {/* Strength meter */}
                                    {formData.password && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex gap-1 flex-1">
                                                {[1, 2, 3, 4].map((level) => (
                                                    <div
                                                        key={level}
                                                        className="h-1 flex-1 rounded-full transition-colors duration-300"
                                                        style={{
                                                            backgroundColor:
                                                                level <= strength
                                                                    ? strengthColors[strength]
                                                                    : "rgb(var(--c-border-highlight))",
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <span
                                                className="text-micro font-medium"
                                                style={{ color: strengthColors[strength] }}
                                            >
                                                {strengthLabels[strength]}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label htmlFor="reg-confirmPassword" className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                        Confirm Password
                                    </label>
                                    <div
                                        className={`relative rounded-[10px] transition-shadow duration-200 ${passwordsDontMatch
                                            ? "shadow-[0_0_0_2px_#F75F6E]"
                                            : passwordsMatch
                                                ? "shadow-[0_0_0_2px_#3ECF8E]"
                                                : focusRing("confirmPassword")
                                            }`}
                                    >
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            id="reg-confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            onFocus={() => setIsFocused("confirmPassword")}
                                            onBlur={() => setIsFocused(null)}
                                            className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none transition-colors pr-12"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                        </button>
                                    </div>
                                    {passwordsDontMatch && (
                                        <p className="text-micro text-danger mt-1 flex items-center gap-1">
                                            <X className="w-3 h-3" /> Passwords don&apos;t match
                                        </p>
                                    )}
                                    {passwordsMatch && (
                                        <p className="text-micro text-success mt-1 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Passwords match
                                        </p>
                                    )}
                                </div>

                                {/* Terms */}
                                <div className="flex items-start gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                                        className={`mt-0.5 w-[18px] h-[18px] rounded flex-shrink-0 border flex items-center justify-center transition-all duration-200 ${agreedToTerms
                                            ? "bg-accent-violet border-accent-violet"
                                            : "bg-surface-raised border-border hover:border-accent-violet/50"
                                            }`}
                                    >
                                        {agreedToTerms && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                    <label className="text-sm text-text-muted leading-snug cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                                        I agree to the{" "}
                                        <a href="#" className="text-accent-violet hover:text-accent-violet-bright transition-colors" onClick={(e) => e.stopPropagation()}>
                                            Terms of Service
                                        </a>{" "}
                                        and{" "}
                                        <a href="#" className="text-accent-violet hover:text-accent-violet-bright transition-colors" onClick={(e) => e.stopPropagation()}>
                                            Privacy Policy
                                        </a>
                                    </label>
                                </div>

                                {/* Error message */}
                                {error && (
                                    <div className="p-3 rounded-[10px] bg-danger/10 border border-danger/20 text-danger text-micro">
                                        {error}
                                    </div>
                                )}

                                {/* Register Button */}
                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        disabled={!agreedToTerms || isLoading}
                                        className="w-full py-3 bg-accent-violet text-white rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] hover:bg-accent-violet-bright active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-accent-violet disabled:active:scale-100"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                Creating account…
                                            </span>
                                        ) : (
                                            "Create Account"
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-micro text-text-muted whitespace-nowrap">or continue with</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* OAuth */}
                            <div className="grid grid-cols-1 gap-3">
                                <GoogleSignInButton
                                    label="Sign up with Google"
                                    onError={(msg) => setError(msg)}
                                />
                            </div>

                            {/* Login link */}
                            <div className="mt-7 text-center text-sm">
                                <span className="text-text-muted">Already have an account? </span>
                                <Link href="/login" className="text-accent-violet hover:text-accent-violet-bright font-medium transition-colors">
                                    Log In
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Back to Home — hidden in desktop app */}
                    {!isTauri && (
                        <div className="mt-6 text-center">
                            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors group">
                                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                                Back to home
                            </Link>
                        </div>
                    )}
                </div>
                <div className="flex-1" />
            </div>
        </div>
    );
}
