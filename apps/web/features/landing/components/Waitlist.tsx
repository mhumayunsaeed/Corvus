"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, Mail } from "lucide-react";
import { joinWaitlist } from "@/shared/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export function Waitlist() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [message, setMessage] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const value = email.trim();
        if (!value) {
            setStatus("error");
            setMessage("Enter your email address.");
            inputRef.current?.focus();
            return;
        }
        setStatus("loading");
        setMessage(null);
        try {
            const response = await joinWaitlist({ email: value, source: "landing-early-access" });
            setStatus("success");
            setMessage(
                response.alreadyJoined
                    ? "You are already on the list—we kept your place."
                    : "You’re in. We’ll email you when early access is ready.",
            );
        } catch (error) {
            setStatus("error");
            setMessage(
                error instanceof Error ? error.message : "Something went wrong. Please try again.",
            );
        }
    }

    return (
        <section id="early-access" className="px-5 py-20 sm:px-8 sm:py-24">
            <div className="mx-auto grid max-w-[1080px] gap-8 rounded-2xl bg-surface p-7 shadow-e2 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
                <div>
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                        <Mail size={16} />
                    </span>
                    <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
                        Follow Corvus as it takes shape.
                    </h2>
                    <p className="mt-3 max-w-[52ch] text-[13px] leading-6 text-text-secondary">
                        Join early access for product updates and invitations. The live demo and
                        source are available now.
                    </p>
                </div>
                {status === "success" ? (
                    <div
                        role="status"
                        className="flex items-start gap-3 rounded-lg bg-live-soft p-4"
                    >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-live text-bg-deep">
                            <Check size={15} />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">Early access confirmed</p>
                            <p className="mt-1 text-[12px] leading-5 text-text-secondary">
                                {message}
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <label
                            htmlFor="early-access-email"
                            className="mb-2 block text-[11px] font-medium text-text-secondary"
                        >
                            Work or personal email
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                ref={inputRef}
                                id="early-access-email"
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    if (status === "error") {
                                        setStatus("idle");
                                        setMessage(null);
                                    }
                                }}
                                aria-invalid={status === "error" || undefined}
                                aria-describedby={message ? "early-access-message" : undefined}
                                placeholder="you@example.com"
                                className="h-11 min-w-0 flex-1 rounded-md bg-surface-raised px-4 text-sm outline-none ring-1 ring-border transition-shadow placeholder:text-text-faint focus:ring-2 focus:ring-accent"
                            />
                            <button
                                disabled={status === "loading"}
                                className="h-11 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60"
                            >
                                {status === "loading" ? "Joining…" : "Join early access"}
                            </button>
                        </div>
                        {message && (
                            <p
                                id="early-access-message"
                                role="alert"
                                className="mt-2 text-[11px] text-danger"
                            >
                                {message}
                            </p>
                        )}
                        <p className="mt-3 text-[10px] text-text-faint">
                            No spam. Unsubscribe at any time.
                        </p>
                    </form>
                )}
            </div>
        </section>
    );
}
