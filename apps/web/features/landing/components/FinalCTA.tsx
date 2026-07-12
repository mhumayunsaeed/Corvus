import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";

export function FinalCTA() {
    return (
        <section className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-32">
            <div className="landing-amber-light" aria-hidden />
            <div className="relative mx-auto max-w-3xl text-center">
                <p className="text-sm font-medium text-accent">The workspace is ready to explore</p>
                <h2 className="mt-5 text-[clamp(36px,6vw,60px)] font-semibold leading-[1.06] tracking-[-0.05em]">
                    Build your next space on software you can inspect.
                </h2>
                <p className="mx-auto mt-5 max-w-[58ch] text-[15px] leading-7 text-text-secondary">
                    See messaging, voice and connected work in the live demo, or follow development
                    in the public repository.
                </p>
                <div className="mt-9 flex flex-wrap justify-center gap-3">
                    <Link
                        href="/spaces/demo"
                        className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
                    >
                        Explore live demo <ArrowRight size={15} />
                    </Link>
                    <a
                        href="https://github.com/Humayun-glitch/Corvus"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center gap-2 rounded-md bg-surface-raised px-5 text-sm font-medium shadow-e1 hover:bg-surface-overlay"
                    >
                        <GitBranch size={16} />
                        View Corvus on GitHub
                    </a>
                </div>
                <a
                    href="#early-access"
                    className="mt-5 inline-block text-[12px] text-text-muted hover:text-text-primary"
                >
                    Or join early access
                </a>
            </div>
        </section>
    );
}
