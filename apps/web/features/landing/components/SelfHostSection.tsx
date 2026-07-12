import {
    ArrowRight,
    Code2,
    Database,
    GitBranch,
    Monitor,
    Radio,
    Server,
    Video,
} from "lucide-react";

const repo = "https://github.com/Humayun-glitch/Corvus";

export function SelfHostSection() {
    return (
        <section
            id="self-hosting"
            className="border-y border-border-subtle bg-bg-deep px-5 py-24 sm:px-8 sm:py-32"
        >
            <div className="mx-auto grid max-w-[1280px] gap-16 lg:grid-cols-[0.85fr_1.15fr]">
                <div>
                    <p className="text-sm font-medium text-accent">
                        Open source and under your control
                    </p>
                    <h2 className="mt-4 text-[clamp(34px,5vw,52px)] font-semibold leading-[1.08] tracking-[-0.04em]">
                        Run the workspace. Keep the context.
                    </h2>
                    <p className="mt-5 max-w-[58ch] text-[15px] leading-7 text-text-secondary">
                        Inspect the code, adapt the product and choose the infrastructure around
                        your team. Corvus is open source under AGPL-3.0 and its desktop application
                        uses Tauri rather than Electron.
                    </p>
                    <div className="mt-8 rounded-lg border-l-2 border-warning bg-warning/10 p-4">
                        <p className="text-[11px] font-semibold text-warning">
                            DEPLOYMENT STATUS · IN PROGRESS
                        </p>
                        <p className="mt-2 text-[13px] leading-6 text-text-secondary">
                            Self-hosting is under active development. The repository and local setup
                            are available today; complete deployment documentation and Docker
                            Compose setup are roadmap work.
                        </p>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-5 text-[13px] font-medium">
                        <a
                            href={repo}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-text-primary hover:text-accent"
                        >
                            <GitBranch size={15} />
                            Browse repository
                        </a>
                        <a
                            href={`${repo}/blob/main/CONTRIBUTING.md`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary"
                        >
                            Contributing guide <ArrowRight size={14} />
                        </a>
                    </div>
                </div>
                <div className="relative rounded-xl bg-surface p-5 shadow-e3 sm:p-7">
                    <p className="mb-6 font-mono text-[10px] tracking-[0.08em] text-text-muted">
                        CURRENT ARCHITECTURE
                    </p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <Node icon={Monitor} title="Clients" detail="Next.js web · Tauri desktop" />
                        <ArrowRight
                            className="mx-auto rotate-90 text-text-faint sm:rotate-0"
                            size={17}
                        />
                        <Node icon={Server} title="Web & API" detail="Next.js · Hono" />
                        <span className="hidden sm:block" />
                        <span className="mx-auto h-6 w-px bg-border sm:h-8" />
                        <span className="hidden sm:block" />
                        <Node icon={Database} title="Supabase" detail="Postgres · Auth · Storage" />
                        <span className="mx-auto hidden h-px w-8 bg-border sm:block" />
                        <Node icon={Radio} title="Realtime" detail="Broadcast · Presence" />
                    </div>
                    <div className="mt-3 flex items-center gap-3 rounded-lg bg-live-soft p-4 text-live">
                        <Video size={17} />
                        <div>
                            <p className="text-[11px] font-semibold">LiveKit media server</p>
                            <p className="mt-0.5 text-[10px] opacity-75">
                                Voice, video and screen sharing
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Node({
    icon: Icon,
    title,
    detail,
}: {
    icon: typeof Code2;
    title: string;
    detail: string;
}) {
    return (
        <div className="rounded-lg bg-surface-raised p-4">
            <Icon size={17} className="text-accent" />
            <p className="mt-5 text-[12px] font-semibold">{title}</p>
            <p className="mt-1 text-[10px] leading-4 text-text-muted">{detail}</p>
        </div>
    );
}
