import { ArrowUpRight, BookOpen, Bug, Code2, GitFork } from "lucide-react";

const repo = "https://github.com/Humayun-glitch/Corvus";
const links = [
    { icon: BookOpen, label: "Read setup documentation", href: `${repo}#getting-started` },
    { icon: Code2, label: "Browse source", href: repo },
    { icon: GitFork, label: "View contributing guide", href: `${repo}/blob/main/CONTRIBUTING.md` },
    { icon: Bug, label: "Report an issue", href: `${repo}/issues/new` },
];

export function DeveloperSection() {
    return (
        <section id="developers" className="px-5 py-24 sm:px-8 sm:py-32">
            <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-2">
                <div>
                    <p className="text-sm font-medium text-accent">Built in the open</p>
                    <h2 className="mt-4 text-[clamp(32px,4vw,48px)] font-semibold leading-tight tracking-[-0.04em]">
                        Start locally. Follow the real code.
                    </h2>
                    <p className="mt-5 max-w-[58ch] text-[15px] leading-7 text-text-secondary">
                        Corvus is a pnpm workspace with separate web, API and Tauri desktop
                        applications. The repository documents the current local-development flow
                        without presenting unfinished SDKs as a product.
                    </p>
                    <div className="mt-8 grid gap-1 sm:grid-cols-2">
                        {links.map(({ icon: Icon, label, href }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center gap-3 rounded-md p-3 text-[12px] text-text-secondary hover:bg-hover-row hover:text-text-primary"
                            >
                                <Icon
                                    size={15}
                                    className="text-text-muted group-hover:text-accent"
                                />
                                <span className="flex-1">{label}</span>
                                <ArrowUpRight size={13} />
                            </a>
                        ))}
                    </div>
                </div>
                <div className="overflow-hidden rounded-xl bg-[#090a0d] shadow-e3 ring-1 ring-white/10">
                    <div className="flex h-10 items-center gap-2 border-b border-white/5 px-4">
                        <span className="h-2 w-2 rounded-full bg-danger/70" />
                        <span className="h-2 w-2 rounded-full bg-warning/70" />
                        <span className="h-2 w-2 rounded-full bg-live/70" />
                        <span className="ml-3 font-mono text-[9px] text-text-faint">
                            terminal · corvus
                        </span>
                    </div>
                    <pre className="overflow-x-auto p-6 font-mono text-[11px] leading-7 text-text-secondary">
                        <code>
                            <span className="text-text-faint"># clone and install</span>
                            {"\n"}
                            <span className="text-accent">git</span> clone
                            https://github.com/Humayun-glitch/Corvus.git{"\n"}
                            <span className="text-accent">cd</span> Corvus &amp;&amp; pnpm install
                            {"\n\n"}
                            <span className="text-text-faint"># run web and API workspaces</span>
                            {"\n"}
                            <span className="text-live">pnpm dev</span>
                            {"\n\n"}
                            <span className="text-text-faint"># run the Tauri desktop shell</span>
                            {"\n"}
                            <span className="text-live">pnpm dev:desktop</span>
                        </code>
                    </pre>
                </div>
            </div>
        </section>
    );
}
