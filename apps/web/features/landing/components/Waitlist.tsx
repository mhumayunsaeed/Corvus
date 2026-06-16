"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { joinWaitlist, fetchWaitlistCount } from "@/shared/lib/api";

type Status = "idle" | "loading" | "success" | "error";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live "N already joined" counter. Best-effort — the form still works if the
  // API is asleep or unreachable.
  useEffect(() => {
    let active = true;
    fetchWaitlistCount()
      .then((res) => {
        if (active) setCount(res.count);
      })
      .catch(() => {
        /* silent — fall back to the generic line */
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("error");
      setMessage("Enter your email to join.");
      inputRef.current?.focus();
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      const res = await joinWaitlist({ email: trimmed, source: "landing-hero" });
      setStatus("success");
      setPosition(res.position);
      setCount(res.count);
      setMessage(
        res.alreadyJoined
          ? "You're already on the list — we'll keep your spot."
          : "You're in. We'll email you the moment your invite is ready."
      );
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  }

  const joinedLabel =
    count && count > 0
      ? `${formatCount(count)} ${count === 1 ? "builder has" : "builders have"} joined the waitlist`
      : "Be one of the first to claim your spot";

  return (
    <section id="waitlist" className="relative overflow-hidden px-6">
      {/* Reuse the landing's single ambient glow for visual continuity. */}
      <div className="hero-glow" aria-hidden />

      <div className="mx-auto flex max-w-[720px] flex-col items-center pb-28 pt-28 text-center sm:pb-32 sm:pt-36">
        {/* Eyebrow */}
        <div
          className="landing-reveal inline-flex items-center gap-2 rounded-[14px] border border-border bg-surface px-3 py-1.5"
          style={{ animationDelay: "0ms" }}
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-violet opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-violet" />
          </span>
          <span className="font-mono text-[12px] tracking-[0.08em] text-text-secondary">
            Private beta · Early access opening soon
          </span>
        </div>

        {/* Headline */}
        <h1
          className="landing-reveal mt-7 text-[clamp(40px,8vw,76px)] font-semibold leading-[1.05] tracking-[-0.035em] text-text-primary"
          style={{ animationDelay: "80ms" }}
        >
          Ship together.
          <br className="hidden sm:block" /> Own your data.
        </h1>

        {/* Subheadline */}
        <p
          className="landing-reveal mt-6 max-w-[520px] text-[17px] leading-[1.6] text-text-secondary"
          style={{ animationDelay: "160ms" }}
        >
          Corvus is the workspace where your team chats, talks, and ships.
          Messaging, voice, kanban, docs, and code review in one 10 MB app you
          can self-host. Join the waitlist for first access.
        </p>

        {/* Form / success state */}
        <div
          className="landing-reveal mt-9 w-full max-w-[480px]"
          style={{ animationDelay: "240ms" }}
        >
          {status === "success" ? (
            <div className="rounded-xl border border-border bg-surface px-6 py-7 text-center inner-shine">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-violet">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M4 10.5l3.5 3.5L16 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-4 text-[16px] font-medium text-text-primary">
                {position
                  ? `You're #${formatCount(position)} on the waitlist`
                  : "You're on the waitlist"}
              </p>
              <p className="mt-1.5 text-[14px] leading-[1.55] text-text-secondary">
                {message}
              </p>
              <Link
                href="/spaces/demo"
                className="mt-5 inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:border-border-highlight hover:text-text-primary"
              >
                Explore the live demo while you wait →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  ref={inputRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") {
                      setStatus("idle");
                      setMessage(null);
                    }
                  }}
                  placeholder="you@company.com"
                  aria-label="Email address"
                  aria-invalid={status === "error" || undefined}
                  className="h-12 flex-1 rounded-lg border border-border bg-surface-raised px-4 text-[15px] text-text-primary placeholder:text-text-muted outline-none transition-[border-color,box-shadow] duration-150 hover:border-border-active focus:border-accent focus:shadow-focus-accent"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-accent-violet px-6 text-[15px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "loading" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="loading-dot h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: "0ms" }} />
                      <span className="loading-dot h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: "150ms" }} />
                      <span className="loading-dot h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : (
                    "Join the waitlist"
                  )}
                </button>
              </div>
              {status === "error" && message && (
                <p className="mt-2.5 text-left text-[13px] text-danger">{message}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-2 text-[13px] text-text-muted">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-online" aria-hidden />
                <span>{joinedLabel}</span>
              </div>
            </form>
          )}
        </div>

        {/* Secondary actions */}
        {status !== "success" && (
          <div
            className="landing-reveal mt-6 flex flex-col items-center gap-3 sm:flex-row"
            style={{ animationDelay: "320ms" }}
          >
            <Link
              href="/spaces/demo"
              className="rounded-lg border border-border px-5 py-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:border-border-highlight hover:text-text-primary"
            >
              Try the demo
            </Link>
            <a
              href="#developers"
              className="rounded-lg border border-border px-5 py-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:border-border-highlight hover:text-text-primary"
            >
              View docs
            </a>
          </div>
        )}

        {/* Reassurance */}
        <p
          className="landing-reveal mt-10 text-[13px] text-text-muted"
          style={{ animationDelay: "400ms" }}
        >
          No spam. One email when your invite is ready. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
