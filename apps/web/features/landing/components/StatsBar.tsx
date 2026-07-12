import { Database, GitBranch, Monitor, Radio, Video } from "lucide-react";

const facts = [
    { icon: GitBranch, title: "AGPL-3.0", detail: "Open codebase" },
    { icon: Monitor, title: "Tauri 2", detail: "Desktop application" },
    { icon: Radio, title: "Supabase Realtime", detail: "Broadcast & presence" },
    { icon: Video, title: "LiveKit", detail: "Voice & video" },
    { icon: Database, title: "Next.js + Hono", detail: "Web & API" },
];

export function StatsBar() {
    return (
        <section
            aria-label="Corvus technology"
            className="border-y border-border-subtle bg-surface/40 px-5 sm:px-8"
        >
            <dl className="mx-auto grid max-w-[1280px] grid-cols-2 lg:grid-cols-5">
                {facts.map(({ icon: Icon, title, detail }, i) => (
                    <div
                        key={title}
                        className={`flex min-h-20 items-center gap-3 py-4 ${i % 2 ? "pl-4" : "pr-4"} lg:px-5 lg:first:pl-0 lg:last:pr-0`}
                    >
                        <Icon size={16} className="shrink-0 text-accent" />
                        <div>
                            <dt className="text-[11px] font-semibold text-text-primary">{title}</dt>
                            <dd className="mt-0.5 text-[10px] text-text-muted">{detail}</dd>
                        </div>
                    </div>
                ))}
            </dl>
        </section>
    );
}
