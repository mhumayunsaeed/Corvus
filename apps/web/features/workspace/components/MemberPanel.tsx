"use client";

import { cn } from "@corvus/ui";
import { X } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { MemberRef, Presence } from "./types";

const DOT: Record<Presence, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-text-faint",
};

/**
 * On-demand member panel (brief: not persistent). Status shown as a dot here,
 * not as an orb on the avatar elsewhere.
 */
export function MemberPanel({
  members,
  onClose,
}: {
  members: MemberRef[];
  onClose?: () => void;
}) {
  const online = members.filter((m) => m.presence && m.presence !== "offline");
  const offline = members.filter((m) => !m.presence || m.presence === "offline");

  return (
    <aside className="absolute inset-0 z-30 flex h-full w-full shrink-0 flex-col bg-background shadow-e3 lg:static lg:w-[240px] lg:shadow-[inset_1px_0_rgb(var(--c-border-subtle))]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-[14px] font-semibold text-text-primary">Members</span>
        <button
          type="button"
          aria-label="Close members"
          onClick={onClose}
          className="text-text-faint transition-colors hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <Group label={`Online — ${online.length}`} members={online} />
        {offline.length > 0 && <Group label={`Offline — ${offline.length}`} members={offline} dim />}
      </div>
    </aside>
  );
}

function Group({ label, members, dim }: { label: string; members: MemberRef[]; dim?: boolean }) {
  if (members.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="px-2 pb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</p>
      {members.map((m) => (
        <div
          key={m.id}
          className={cn(
            "flex items-center gap-2.5 rounded-sm px-2 py-1.5 transition-colors hover:bg-hover-row",
            dim && "opacity-50"
          )}
        >
          <div className="relative">
            <Avatar src={m.avatar} name={m.name} size={28} radius={6} />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                DOT[m.presence ?? "offline"]
              )}
            />
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            {m.roleColor && (
              <span className="inline-block h-2.5 w-0.5 rounded-full" style={{ background: m.roleColor }} />
            )}
            <span className="truncate text-[14px] text-text-secondary">{m.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
