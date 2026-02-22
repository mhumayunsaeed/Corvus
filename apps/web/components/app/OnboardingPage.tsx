"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Upload,
    Sparkles,
    Check,
    ChevronLeft,
    ChevronRight,
    Monitor,
    Bell,
    Zap,
    Wifi,
} from "lucide-react";
import { interestTags, discoveryServers } from "@/data/mockData";
import { useAuthStore } from "@/stores/auth-store";

type OnboardingStep = 1 | 2 | 3 | 4;

export function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
    const [profile, setProfile] = useState({
        avatar: "",
        displayName: "",
        username: "",
        bio: "",
    });
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [joinedServers, setJoinedServers] = useState<string[]>([]);
    const router = useRouter();
    const { completeOnboarding, updateUser } = useAuthStore();

    const totalSteps = 4;
    const stepContentRef = useRef<HTMLDivElement>(null);

    /* GSAP step transitions */
    const animateStepIn = useCallback(async (direction: number) => {
        if (!stepContentRef.current) return;
        const gsapModule = await import("gsap");
        const gsap = gsapModule.default;
        gsap.fromTo(
            stepContentRef.current,
            { opacity: 0, x: direction * 40 },
            { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" }
        );
    }, []);

    useEffect(() => {
        animateStepIn(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const go = (dir: 1 | -1) => {
        const next = (currentStep + dir) as OnboardingStep;
        if (next < 1 || next > totalSteps) return;
        setCurrentStep(next);
        animateStepIn(dir);
    };

    const handleSkip = () => {
        completeOnboarding();
        router.push("/app");
    };
    const handleFinish = () => {
        // Save profile data
        if (profile.displayName || profile.username || profile.bio) {
            updateUser({
                displayName: profile.displayName || undefined,
                username: profile.username || undefined,
                bio: profile.bio || undefined,
            });
        }
        completeOnboarding();
        router.push("/app");
    };

    const toggleInterest = (interest: string) => {
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(selectedInterests.filter((i) => i !== interest));
        } else if (selectedInterests.length < 5) {
            setSelectedInterests([...selectedInterests, interest]);
        }
    };

    const toggleServer = (serverId: string) => {
        if (joinedServers.includes(serverId)) {
            setJoinedServers(joinedServers.filter((id) => id !== serverId));
        } else {
            setJoinedServers([...joinedServers, serverId]);
        }
    };

    /* ── Step label map ── */
    const stepLabels = ["Profile", "Interests", "Discover", "Desktop App"];

    return (
        <div className="h-full bg-background flex items-center justify-center px-6 py-10 relative overflow-y-auto overflow-x-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] bg-accent-violet/[0.06] rounded-full blur-[180px]" />
                <div className="absolute bottom-[15%] right-[10%] w-[400px] h-[400px] bg-accent-teal/[0.05] rounded-full blur-[160px]" />
            </div>

            <div className="w-full max-w-[640px] relative z-10">
                {/* ── Progress bar (redesigned) ── */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-3">
                        {stepLabels.map((label, i) => {
                            const step = i + 1;
                            const isComplete = step < currentStep;
                            const isCurrent = step === currentStep;
                            return (
                                <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-micro font-semibold transition-all duration-300 ${isComplete
                                            ? "bg-accent-teal text-white"
                                            : isCurrent
                                                ? "bg-accent-violet text-white shadow-glow"
                                                : "bg-surface border border-border text-text-muted"
                                            }`}
                                    >
                                        {isComplete ? <Check className="w-4 h-4" /> : step}
                                    </div>
                                    <span
                                        className={`text-micro font-medium transition-colors hidden sm:block ${isCurrent ? "text-text-primary" : "text-text-muted"
                                            }`}
                                    >
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    {/* Progress line */}
                    <div className="relative h-1 bg-border rounded-full overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-violet to-accent-teal rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                        />
                    </div>
                </div>

                {/* ── Step content ── */}
                <div ref={stepContentRef}>
                    {/* Step 1 — Profile */}
                    {currentStep === 1 && (
                        <div className="bg-surface/90 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl shadow-black/20">
                            <h2 className="text-2xl font-bold text-text-primary mb-1">Set up your profile</h2>
                            <p className="text-text-muted text-sm mb-8">Tell us a bit about yourself</p>

                            <div className="space-y-6">
                                {/* Avatar */}
                                <div className="flex flex-col items-center">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-violet to-accent-teal p-[2px]">
                                            <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                                                {profile.avatar ? (
                                                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Upload className="w-7 h-7 text-text-muted" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <button className="mt-3 text-micro text-accent-violet hover:text-[#6B59E6] flex items-center gap-1.5 transition-colors">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Generate avatar
                                    </button>
                                </div>

                                {/* Display Name */}
                                <div>
                                    <label htmlFor="ob-displayName" className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        id="ob-displayName"
                                        value={profile.displayName}
                                        onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                                        className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent transition-all"
                                        placeholder="Your Name"
                                    />
                                </div>

                                {/* Username */}
                                <div>
                                    <label htmlFor="ob-username" className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        id="ob-username"
                                        value={profile.username}
                                        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                        className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent transition-all"
                                        placeholder="@username"
                                    />
                                </div>

                                {/* Bio */}
                                <div>
                                    <label htmlFor="ob-bio" className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                        Bio <span className="normal-case tracking-normal text-text-muted">(optional)</span>
                                    </label>
                                    <textarea
                                        id="ob-bio"
                                        value={profile.bio}
                                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                        maxLength={150}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted text-body focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent transition-all resize-none"
                                        placeholder="Tell us about yourself..."
                                    />
                                    <div className="flex justify-end mt-1">
                                        <span className={`text-micro ${profile.bio.length > 130 ? "text-danger" : "text-text-muted"}`}>
                                            {profile.bio.length}/150
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Interests */}
                    {currentStep === 2 && (
                        <div className="bg-surface/90 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl shadow-black/20">
                            <h2 className="text-2xl font-bold text-text-primary mb-1">What are you interested in?</h2>
                            <p className="text-text-muted text-sm mb-2">Pick up to 5 — we&apos;ll find you the right communities</p>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full transition-colors duration-200 ${i <= selectedInterests.length ? "bg-accent-violet" : "bg-border"
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-micro text-text-muted">{selectedInterests.length}/5 selected</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {interestTags.map((interest) => {
                                    const isSelected = selectedInterests.includes(interest);
                                    const isDisabled = !isSelected && selectedInterests.length >= 5;
                                    return (
                                        <button
                                            key={interest}
                                            onClick={() => toggleInterest(interest)}
                                            disabled={isDisabled}
                                            className={`px-4 py-3 rounded-xl font-medium text-body transition-all duration-200 border ${isSelected
                                                ? "bg-accent-violet/15 text-accent-violet border-accent-violet shadow-[0_0_16px_rgba(124,106,247,0.15)]"
                                                : isDisabled
                                                    ? "bg-surface-raised text-text-muted border-border opacity-40 cursor-not-allowed"
                                                    : "bg-surface-raised text-text-primary border-border hover:border-accent-violet/40 hover:bg-hover-row"
                                                }`}
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                {interest}
                                                {isSelected && <Check className="w-4 h-4" />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3 — Discover Servers */}
                    {currentStep === 3 && (
                        <div className="bg-surface/90 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl shadow-black/20">
                            <h2 className="text-2xl font-bold text-text-primary mb-1">Discover communities</h2>
                            <p className="text-text-muted text-sm mb-6">Join servers based on your interests</p>

                            <div className="space-y-3">
                                {discoveryServers.map((server) => {
                                    const isJoined = joinedServers.includes(server.id);
                                    return (
                                        <div
                                            key={server.id}
                                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${isJoined
                                                ? "bg-accent-violet/5 border-accent-violet/30"
                                                : "bg-surface-raised hover:bg-hover-row border-border"
                                                }`}
                                        >
                                            <img
                                                src={server.icon}
                                                alt={server.name}
                                                className="w-14 h-14 rounded-xl bg-surface border border-border flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-text-primary text-body truncate">{server.name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-micro text-text-muted">{server.members.toLocaleString()} members</span>
                                                </div>
                                                {server.tags && (
                                                    <div className="flex gap-1.5 mt-2">
                                                        {server.tags.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="text-micro px-2 py-0.5 bg-background rounded-md text-text-muted border border-border"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => toggleServer(server.id)}
                                                className={`px-5 py-2 rounded-lg text-body font-medium transition-all duration-200 flex-shrink-0 ${isJoined
                                                    ? "bg-surface text-text-muted border border-border hover:bg-surface-raised"
                                                    : "bg-accent-violet hover:bg-[#6B59E6] text-white shadow-glow hover:shadow-[0_0_20px_rgba(124,106,247,0.25)]"
                                                    }`}
                                            >
                                                {isJoined ? "Joined ✓" : "Join"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 4 — Desktop App */}
                    {currentStep === 4 && (
                        <div className="bg-surface/90 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl shadow-black/20 text-center">
                            <div className="relative inline-block mb-6">
                                <div className="absolute -inset-6 bg-gradient-to-br from-accent-violet/20 to-accent-teal/10 rounded-full blur-[60px]" />
                                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-violet to-accent-teal flex items-center justify-center shadow-glow">
                                    <span className="text-white font-bold text-3xl">V</span>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-text-primary mb-2">Get the desktop app</h2>
                            <p className="text-text-muted text-sm max-w-sm mx-auto mb-8">
                                For the best experience, download Veyra for your desktop. Under 15MB, instant setup.
                            </p>

                            {/* Feature highlights */}
                            <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm mx-auto text-left">
                                {[
                                    { icon: Bell, text: "Native notifications" },
                                    { icon: Zap, text: "Lightning fast" },
                                    { icon: Monitor, text: "Push-to-talk" },
                                    { icon: Wifi, text: "Offline cache" },
                                ].map(({ icon: Icon, text }) => (
                                    <div
                                        key={text}
                                        className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-raised border border-border"
                                    >
                                        <Icon className="w-4 h-4 text-accent-teal flex-shrink-0" />
                                        <span className="text-micro text-text-primary">{text}</span>
                                    </div>
                                ))}
                            </div>

                            <button className="px-8 py-3.5 bg-accent-violet hover:bg-[#6B59E6] text-white rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] active:scale-[0.98] inline-flex items-center gap-2">
                                <Monitor className="w-5 h-5" />
                                Download for Windows
                            </button>

                            <div className="mt-4">
                                <button
                                    onClick={handleSkip}
                                    className="text-micro text-text-muted hover:text-text-primary transition-colors"
                                >
                                    Skip for now
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Navigation ── */}
                <div className="flex items-center justify-between mt-8">
                    <button
                        onClick={() => go(-1)}
                        disabled={currentStep === 1}
                        className="px-5 py-2.5 bg-surface hover:bg-surface-raised text-text-primary rounded-[10px] font-medium text-body transition-all border border-border disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>

                    <button
                        onClick={currentStep === totalSteps ? handleFinish : () => go(1)}
                        className="px-5 py-2.5 bg-accent-violet hover:bg-[#6B59E6] text-white rounded-[10px] font-medium text-body transition-all duration-200 hover:shadow-[0_0_20px_rgba(124,106,247,0.3)] active:scale-[0.98] flex items-center gap-2"
                    >
                        {currentStep === totalSteps ? "Finish" : "Next"}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Skip */}
                {currentStep < totalSteps && (
                    <div className="text-center mt-5">
                        <button
                            onClick={handleSkip}
                            className="text-micro text-text-muted hover:text-text-primary transition-colors"
                        >
                            Skip onboarding
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
