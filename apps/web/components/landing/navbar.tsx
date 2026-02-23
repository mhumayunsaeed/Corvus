"use client";

import { useEffect, useState } from "react";
import { cn } from "@corvus/ui";
import Link from "next/link";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Community", href: "#community" },
  { label: "Download", href: "#download" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.getElementById("landing-scroll");
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 60);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 lg:px-10 transition-all duration-300",
        scrolled
          ? "bg-channel-sidebar/80 backdrop-blur-[12px] border-b border-border"
          : "bg-transparent"
      )}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <img src="/corvus-logo.png" alt="Corvus" className="w-9 h-9 rounded-full shadow-glow group-hover:shadow-[0_0_30px_rgba(124,106,247,0.3)] transition-shadow" />
        <span className="text-text-primary font-semibold text-emphasis hidden sm:block">
          Corvus
        </span>
      </Link>

      {/* Center nav links */}
      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="px-4 py-2 text-body text-text-muted hover:text-text-primary rounded-sm transition-colors duration-150"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Right CTAs */}
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="px-4 py-2 text-body text-text-muted hover:text-text-primary transition-colors duration-150"
        >
          Log In
        </Link>
        <Link
          href="/register"
          className="px-5 py-2.5 bg-accent-violet text-white text-body font-medium rounded-md hover:bg-accent-violet/90 shadow-glow hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] transition-all duration-150 active:scale-[0.97]"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
