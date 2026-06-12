import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6">
      {/* The page's single ambient effect. */}
      <div className="hero-glow" aria-hidden />

      <div className="mx-auto flex max-w-[720px] flex-col items-center pb-28 pt-28 text-center sm:pb-32 sm:pt-36">
        {/* Eyebrow */}
        <div
          className="landing-reveal inline-flex items-center gap-2 rounded-[14px] border border-border bg-surface px-3 py-1.5"
          style={{ animationDelay: "0ms" }}
        >
          <span className="font-mono text-[12px] leading-none text-accent-violet">↗</span>
          <span className="text-[12px] tracking-[0.08em] text-text-secondary">
            Private cloud · Team-owned data
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
          className="landing-reveal mt-6 max-w-[480px] text-[17px] leading-[1.6] text-text-secondary"
          style={{ animationDelay: "160ms" }}
        >
          Messaging, voice, kanban, docs, and code review — in one 10 MB
          desktop app. Deploy in five minutes. No subscriptions.
        </p>

        {/* CTAs */}
        <div
          className="landing-reveal mt-9 flex flex-col items-center gap-3 sm:flex-row"
          style={{ animationDelay: "240ms" }}
        >
          <Link
            href="/register"
            className="rounded-lg bg-accent-violet px-5 py-2.5 text-[14px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            Start building →
          </Link>
          <a
            href="#developers"
            className="rounded-lg border border-border px-5 py-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:border-border-highlight hover:text-text-primary"
          >
            View docs
          </a>
        </div>

        {/* Social proof */}
        <p
          className="landing-reveal mt-12 text-[13px] text-text-muted"
          style={{ animationDelay: "320ms" }}
        >
          Trusted by engineering teams at 200+ companies.
        </p>
      </div>
    </section>
  );
}
