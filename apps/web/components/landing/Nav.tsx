"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@corvus/ui";

// Root-relative anchors so the links also work from /product, /legal, etc.
const navLinks = [
  { label: "Product", href: "/#product" },
  { label: "Developers", href: "/#developers" },
  { label: "Self-host", href: "/#self-host" },
  { label: "Changelog", href: "/changelog" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  // Lock background scroll while the mobile menu is open.
  useEffect(() => {
    const el = document.getElementById("landing-scroll");
    if (el) el.style.overflowY = open ? "hidden" : "auto";
    return () => {
      if (el) el.style.overflowY = "auto";
    };
  }, [open]);

  return (
    <header
      className="sticky top-0 z-50 h-16 border-b border-border"
      style={{
        background: "rgb(var(--c-background) / 0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <nav
        role="navigation"
        aria-label="Main navigation"
        className="mx-auto flex h-full max-w-6xl items-center justify-between px-6"
      >
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/corvus-logo-small.png"
            alt=""
            className="h-7 w-7 rounded-full"
            draggable={false}
          />
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">
            Corvus
          </span>
        </Link>

        {/* Center links */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[14px] font-[450] text-text-muted transition-colors hover:text-text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="text-[14px] font-[450] text-text-muted transition-colors hover:text-text-primary"
          >
            Sign in
          </Link>
          <a
            href="/#waitlist"
            className="rounded-md bg-accent-violet px-4 py-2 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            Join waitlist →
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:text-text-primary md:hidden"
        >
          <div className="flex w-4 flex-col items-end gap-[5px]">
            <span
              className={cn(
                "h-[1.5px] w-full bg-current transition-transform",
                open && "translate-y-[6.5px] rotate-45"
              )}
            />
            <span
              className={cn(
                "h-[1.5px] w-3 bg-current transition-opacity",
                open && "opacity-0"
              )}
            />
            <span
              className={cn(
                "h-[1.5px] w-full bg-current transition-transform",
                open && "-translate-y-[6.5px] -rotate-45"
              )}
            />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-b border-border bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md py-2 text-[15px] text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <Link
              href="/login"
              className="rounded-md py-2 text-[15px] text-text-secondary hover:text-text-primary"
            >
              Sign in
            </Link>
            <a
              href="/#waitlist"
              onClick={() => setOpen(false)}
              className="rounded-md bg-accent-violet px-4 py-2.5 text-center text-[14px] font-medium text-on-accent"
            >
              Join waitlist →
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
