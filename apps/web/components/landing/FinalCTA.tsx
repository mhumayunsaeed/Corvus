import Link from "next/link";

export function FinalCTA() {
  return (
    <section id="pricing" className="border-t border-border px-6 py-24 sm:py-28">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="text-[40px] font-medium leading-[1.1] tracking-[-0.025em] text-text-primary">
          Your stack. Your rules.
        </h2>
        <p className="mt-4 text-[16px] leading-[1.6] text-text-secondary">
          Start free. Deploy on your infrastructure when you are ready.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-lg bg-accent-violet px-6 py-3 text-[15px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            Start building →
          </Link>
          <Link
            href="/spaces/demo"
            className="rounded-lg border border-border px-6 py-3 text-[15px] font-medium text-text-secondary transition-colors hover:border-border-highlight hover:text-text-primary"
          >
            Try Demo
          </Link>
          <a
            href="#developers"
            className="rounded-lg border border-border px-6 py-3 text-[15px] font-medium text-text-secondary transition-colors hover:border-border-highlight hover:text-text-primary"
          >
            View docs
          </a>
        </div>

        <p className="mt-8 text-[12px] text-text-muted">
          No credit card. No vendor lock-in. No 300 MB Electron tax.
        </p>
      </div>
    </section>
  );
}
