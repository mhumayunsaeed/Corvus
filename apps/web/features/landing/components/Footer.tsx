import Link from "next/link";

const groups = [
    {
        title: "Product",
        links: [
            ["Product", "/#product"],
            ["Live demo", "/spaces/demo"],
            ["Sign in", "/login"],
            ["Early access", "/#early-access"],
        ],
    },
    {
        title: "Project",
        links: [
            ["GitHub", "https://github.com/Humayun-glitch/Corvus"],
            ["Roadmap", "https://github.com/Humayun-glitch/Corvus#roadmap"],
            ["Releases", "https://github.com/Humayun-glitch/Corvus/releases"],
            ["Open issues", "https://github.com/Humayun-glitch/Corvus/issues"],
        ],
    },
    {
        title: "Resources",
        links: [
            ["Documentation", "https://github.com/Humayun-glitch/Corvus#readme"],
            ["Contributing", "https://github.com/Humayun-glitch/Corvus/blob/main/CONTRIBUTING.md"],
            ["License", "/legal/license"],
            ["Privacy", "/legal/privacy"],
        ],
    },
];

export function Footer() {
    return (
        <footer className="border-t border-border-subtle bg-bg-deep px-5 py-14 sm:px-8">
            <div className="mx-auto grid max-w-[1280px] gap-12 md:grid-cols-[1.5fr_2fr]">
                <div>
                    <Link href="/" className="flex items-center gap-2.5">
                        <img src="/corvus-logo-small.png" alt="" className="h-7 w-7 rounded-full" />
                        <span className="text-sm font-semibold">Corvus</span>
                    </Link>
                    <p className="mt-4 max-w-[34ch] text-[12px] leading-5 text-text-muted">
                        A lightweight, open-source communication workspace for technical teams and
                        private communities.
                    </p>
                    <p className="mt-7 text-[10px] text-text-faint">
                        Built by Humayun and contributors · AGPL-3.0
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                    {groups.map((group) => (
                        <div key={group.title}>
                            <h2 className="text-[11px] font-semibold">{group.title}</h2>
                            <ul className="mt-4 space-y-3">
                                {group.links.map(([label, href]) => (
                                    <li key={label}>
                                        <a
                                            href={href}
                                            className="text-[11px] text-text-muted hover:text-text-primary"
                                        >
                                            {label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </footer>
    );
}
