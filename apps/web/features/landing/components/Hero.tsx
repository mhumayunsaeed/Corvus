import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";
import { ProductFrame } from "./ProductFrame";

export function Hero() {
    return (
        <section className="relative w-[100vw] max-w-[100vw] overflow-hidden px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:pt-28">
            <div className="landing-signal-grid" aria-hidden />
            <div className="landing-amber-light" aria-hidden />
            <div className="relative mx-auto grid w-full min-w-0 max-w-[calc(100vw-40px)] items-center gap-14 sm:max-w-[calc(100vw-64px)] lg:max-w-[1280px] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10 xl:gap-16">
                <div className="relative z-10 w-full min-w-0 max-w-[calc(100vw-40px)] sm:max-w-[calc(100vw-64px)] lg:max-w-full">
                    <p className="landing-reveal flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-text-secondary">
                        <span className="text-accent">Open source</span>
                        <span aria-hidden>·</span>
                        <span>Lightweight desktop app</span>
                        <span aria-hidden>·</span>
                        <span>Built for private spaces</span>
                    </p>
                    <h1
                        className="landing-reveal mt-6 max-w-full break-words text-[clamp(37px,6vw,72px)] font-semibold leading-[1.02] tracking-[-0.05em] text-text-primary lg:max-w-[680px]"
                        style={{ animationDelay: "70ms" }}
                    >
                        Your team&apos;s conversations.{" "}
                        <span className="text-text-secondary">Your infrastructure.</span>
                    </h1>
                    <p
                        className="landing-reveal mt-7 max-w-[56ch] text-[16px] leading-7 text-text-secondary sm:text-[17px]"
                        style={{ animationDelay: "140ms" }}
                    >
                        Corvus brings channels, direct messages, voice and connected work into one
                        focused workspace, with an open codebase and a lightweight Tauri desktop
                        app.
                    </p>
                    <div
                        className="landing-reveal mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center"
                        style={{ animationDelay: "210ms" }}
                    >
                        <Link
                            href="/spaces/demo"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
                        >
                            Explore the live demo <ArrowRight size={15} />
                        </Link>
                        <a
                            href="https://github.com/Humayun-glitch/Corvus"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-surface-raised px-5 text-sm font-medium text-text-primary shadow-e1 transition-colors hover:bg-surface-overlay"
                        >
                            <GitBranch size={16} /> View on GitHub
                        </a>
                        <a
                            href="#early-access"
                            className="px-2 py-2 text-center text-sm font-medium text-text-secondary hover:text-text-primary"
                        >
                            Join early access
                        </a>
                    </div>
                    <dl
                        className="landing-reveal mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border-subtle pt-5"
                        style={{ animationDelay: "280ms" }}
                    >
                        <div>
                            <dt className="text-[11px] text-text-muted">Realtime</dt>
                            <dd className="mt-1 text-[12px] font-medium">Supabase</dd>
                        </div>
                        <div>
                            <dt className="text-[11px] text-text-muted">Voice &amp; video</dt>
                            <dd className="mt-1 text-[12px] font-medium">LiveKit</dd>
                        </div>
                        <div>
                            <dt className="text-[11px] text-text-muted">Desktop</dt>
                            <dd className="mt-1 text-[12px] font-medium">Tauri 2</dd>
                        </div>
                    </dl>
                </div>
                <div
                    className="landing-reveal relative min-w-0 lg:-mr-28 xl:-mr-40"
                    style={{ animationDelay: "180ms" }}
                >
                    <ProductFrame className="lg:rounded-l-xl lg:rounded-r-none xl:rounded-r-xl" />
                </div>
            </div>
        </section>
    );
}
