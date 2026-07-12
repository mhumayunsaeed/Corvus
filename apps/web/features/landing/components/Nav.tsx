"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, Menu, X } from "lucide-react";
import { cn } from "@corvus/ui";

const links = [
    { label: "Product", href: "/#product" },
    { label: "Demo", href: "/spaces/demo" },
    { label: "Self-hosting", href: "/#self-hosting" },
    { label: "Developers", href: "/#developers" },
    { label: "GitHub", href: "https://github.com/Humayun-glitch/Corvus", external: true },
];

export function Nav() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const container = document.getElementById("landing-scroll");
        const handleScroll = () => setScrolled((container?.scrollTop ?? 0) > 12);
        container?.addEventListener("scroll", handleScroll, { passive: true });
        return () => container?.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const container = document.getElementById("landing-scroll");
        if (container) container.style.overflowY = open ? "hidden" : "auto";
        return () => {
            if (container) container.style.overflowY = "auto";
        };
    }, [open]);

    return (
        <header
            className={cn(
                "sticky top-0 z-50 w-[100vw] max-w-[100vw] transition-[background-color,border-color,box-shadow] duration-200",
                scrolled || open
                    ? "border-b border-border-subtle bg-background/95 shadow-e1 backdrop-blur-xl"
                    : "border-b border-transparent bg-background/75 backdrop-blur-md",
            )}
        >
            <nav
                aria-label="Main navigation"
                className="mx-auto flex h-16 w-full max-w-[1280px] items-center px-5 sm:px-8"
            >
                <Link
                    href="/"
                    className="group flex shrink-0 items-center gap-2.5"
                    aria-label="Corvus home"
                >
                    <img
                        src="/corvus-logo-small.png"
                        alt=""
                        className="h-7 w-7 rounded-full"
                        draggable={false}
                    />
                    <span className="text-[15px] font-semibold tracking-[-0.02em]">Corvus</span>
                    <span className="hidden rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent sm:inline">
                        OPEN SOURCE
                    </span>
                </Link>

                <div className="mx-auto hidden items-center gap-7 lg:flex">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            target={link.external ? "_blank" : undefined}
                            rel={link.external ? "noreferrer" : undefined}
                            className="text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="ml-auto hidden items-center gap-5 lg:flex">
                    <Link
                        href="/login"
                        className="text-[13px] font-medium text-text-secondary hover:text-text-primary"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/spaces/demo"
                        className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
                    >
                        Explore live demo
                    </Link>
                </div>

                <button
                    type="button"
                    aria-label={open ? "Close navigation" : "Open navigation"}
                    aria-expanded={open}
                    onClick={() => setOpen((value) => !value)}
                    className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-md text-text-secondary hover:bg-hover-row hover:text-text-primary lg:hidden"
                >
                    {open ? <X size={19} /> : <Menu size={19} />}
                </button>
            </nav>

            {open && (
                <div className="border-t border-border-subtle px-5 pb-6 pt-3 lg:hidden">
                    <div className="mx-auto flex max-w-[1280px] flex-col">
                        {links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                target={link.external ? "_blank" : undefined}
                                rel={link.external ? "noreferrer" : undefined}
                                className="flex min-h-11 items-center justify-between border-b border-border-subtle text-[15px] text-text-secondary hover:text-text-primary"
                            >
                                {link.label}
                                {link.external && <GitBranch size={15} />}
                            </a>
                        ))}
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <Link
                                href="/login"
                                className="grid h-11 place-items-center rounded-md bg-surface-raised text-sm font-medium"
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/spaces/demo"
                                className="grid h-11 place-items-center rounded-md bg-accent text-sm font-semibold text-on-accent"
                            >
                                Explore demo
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
