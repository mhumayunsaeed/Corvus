"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@corvus/ui";

/**
 * Admin panel (brief §Self-hosting) — a separate route for the instance
 * owner. Two-column layout: 220px nav + content. No app shell.
 */
const NAV: { label: string; href: string; danger?: boolean }[] = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Spaces", href: "/admin/spaces" },
  { label: "Storage", href: "/admin/storage" },
  { label: "Integrations", href: "/admin/integrations" },
  { label: "SMTP / Email", href: "/admin/smtp" },
  { label: "Security", href: "/admin/security" },
  { label: "Updates", href: "/admin/updates" },
  { label: "Danger zone", href: "/admin/danger", danger: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 bg-background">
      <nav className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-raised py-4">
        <div className="px-4 pb-4">
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">Corvus</span>
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">admin</span>
        </div>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              className={cn(
                "mx-2 flex h-8 items-center rounded-sm px-2 text-[14px] transition-colors",
                active
                  ? "bg-surface-overlay font-medium text-text-primary"
                  : item.danger
                    ? "text-danger/80 hover:bg-hover-row hover:text-danger"
                    : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[840px] px-10 py-10">{children}</div>
      </div>
    </div>
  );
}
