"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, X, Github, ArrowLeft, Shield } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

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
                    <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-accent-violet to-accent-teal flex items-center justify-center shadow-glow">
                        <span className="text-white font-bold text-4xl">V</span>
                    </div>
                </div>
                <h2 className="mt-10 text-4xl font-bold text-text-primary tracking-tight text-center leading-tight max-w-sm">
                    Join the
                    <br />
                    <span className="bg-gradient-to-r from-accent-violet to-accent-teal bg-clip-text text-transparent">
                        community.
                    </span>
                </h2>
                <p className="mt-4 text-text-muted text-center max-w-xs leading-relaxed">
                    Create your account and discover servers, make friends, and connect with the world.
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
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-violet to-accent-teal flex items-center justify-center shadow-glow">
                                    <span className="text-white font-bold text-lg">V</span>
                                </div>
                                <span className="text-xl font-bold text-text-primary tracking-tight">Veyra</span>
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
                                                                    : "#2A2A35",
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
                                        <a href="#" className="text-accent-violet hover:text-[#6B59E6] transition-colors" onClick={(e) => e.stopPropagation()}>
                                            Terms of Service
                                        </a>{" "}
                                        and{" "}
                                        <a href="#" className="text-accent-violet hover:text-[#6B59E6] transition-colors" onClick={(e) => e.stopPropagation()}>
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
                                        className="w-full py-3 bg-accent-violet text-white rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] hover:bg-[#6B59E6] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-accent-violet disabled:active:scale-100"
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
                            <div className="grid grid-cols-3 gap-3">
                                <button className="flex items-center justify-center py-2.5 bg-surface-raised hover:bg-hover-row border border-border rounded-[10px] transition-all">
                                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                </button>
                                <button className="flex items-center justify-center py-2.5 bg-surface-raised hover:bg-hover-row border border-border rounded-[10px] transition-all">
                                    <Github className="w-[18px] h-[18px] text-text-primary" />
                                </button>
                                <button className="flex items-center justify-center py-2.5 bg-surface-raised hover:bg-hover-row border border-border rounded-[10px] transition-all">
                                    <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Login link */}
                            <div className="mt-7 text-center text-sm">
                                <span className="text-text-muted">Already have an account? </span>
                                <Link href="/login" className="text-accent-violet hover:text-[#6B59E6] font-medium transition-colors">
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
