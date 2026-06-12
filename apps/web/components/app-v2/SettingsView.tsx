"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { X } from "lucide-react";
import { Avatar, Input } from "@/components/ui";
import { AutomationsSettings, WebhooksSettings } from "./AutomationsSettings";
import {
  MyAccountSettings,
  ProfileSettings,
  PrivacySettings,
  NotificationsSettings,
  AppearanceSettings,
  KeybindingsSettings,
  DevicesSettings,
  AdvancedSettings,
} from "./UserSettings";
import type { MemberRef } from "./types";

/**
 * Settings (brief §Settings). Two-column layout — 240px nav + content — not a
 * modal. Rendered as a full-surface overlay inside the shell.
 */
const SECTIONS = [
  { group: "User", items: ["My Account", "Profile", "Privacy"] },
  { group: "App", items: ["Notifications", "Appearance", "Keybindings"] },
  { group: "Space", items: ["Space profile", "Members", "Integrations", "Automations", "Webhooks"] },
  { group: "System", items: ["Devices", "Advanced"] },
];

export function SettingsView({
  spaceName,
  members,
  onClose,
}: {
  spaceName?: string;
  members?: MemberRef[];
  onClose?: () => void;
}) {
  const [active, setActive] = useState("My Account");

  return (
    <div className="absolute inset-0 z-40 flex bg-background">
      {/* Nav */}
      <nav className="flex w-[240px] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-raised py-4">
        {SECTIONS.map((section) => (
          <div key={section.group} className="mb-2">
            <p className="px-4 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
              {section.group}
            </p>
            {section.items.map((item) => (
              <button
                key={item}
                type="button"
                data-active={item === active}
                onClick={() => setActive(item)}
                className={cn(
                  "mx-2 flex h-8 items-center rounded-sm px-2 text-left text-[14px] transition-colors",
                  item === active
                    ? "bg-surface-overlay font-medium text-text-primary"
                    : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Content */}
      <div className="relative flex-1 overflow-y-auto">
        <button
          type="button"
          aria-label="Close settings"
          onClick={onClose}
          className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
        >
          <X size={18} />
        </button>

        <div className="mx-auto max-w-[640px] px-10 py-8">
          <h1 className="text-[24px] font-semibold text-text-primary">{active}</h1>
          <div className="mt-4 h-px bg-border" />

          {active === "Space profile" ? (
            <SpaceProfileSettings spaceName={spaceName} />
          ) : active === "Members" ? (
            <MembersSettings members={members ?? []} />
          ) : active === "Automations" ? (
            <AutomationsSettings />
          ) : active === "Webhooks" ? (
            <WebhooksSettings />
          ) : active === "Integrations" ? (
            <IntegrationsSettings />
          ) : active === "My Account" ? (
            <MyAccountSettings />
          ) : active === "Profile" ? (
            <ProfileSettings />
          ) : active === "Privacy" ? (
            <PrivacySettings />
          ) : active === "Notifications" ? (
            <NotificationsSettings />
          ) : active === "Appearance" ? (
            <AppearanceSettings />
          ) : active === "Keybindings" ? (
            <KeybindingsSettings />
          ) : active === "Devices" ? (
            <DevicesSettings />
          ) : (
            <AdvancedSettings />
          )}
        </div>
      </div>
    </div>
  );
}

/** Space profile — name + invite link. The space's identity, no banner art. */
function SpaceProfileSettings({ spaceName }: { spaceName?: string }) {
  const [copied, setCopied] = useState(false);
  const invite = "https://corvus.app/join/3f9a2c";
  return (
    <div className="mt-6 flex flex-col gap-6">
      <Field label="Space name" hint="Shown in the rail and at the top of the panel.">
        <Input defaultValue={spaceName ?? "Space"} />
      </Field>
      <div>
        <p className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
          Invite link
        </p>
        <div className="flex gap-2">
          <code className="flex h-9 min-w-0 flex-1 items-center truncate rounded-md border border-border bg-surface-raised px-3 font-mono text-[12px] text-text-secondary">
            {invite}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(invite);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="h-9 shrink-0 rounded-md border border-border px-3 text-[13px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-1.5 text-[12px] text-text-muted">
          Anyone with the link can join. Regenerate it to revoke old invites.
        </p>
      </div>
    </div>
  );
}

/** Space members — roles as quiet mono chips, actions on hover. */
function MembersSettings({ members }: { members: MemberRef[] }) {
  return (
    <div className="mt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
        Members — {members.length}
      </p>
      <div className="mt-2 flex flex-col">
        {members.map((m) => (
          <div
            key={m.id}
            className="group flex h-12 items-center gap-3 border-b border-border px-1 transition-colors hover:bg-hover-row"
          >
            <Avatar src={m.avatar} name={m.name} size={28} radius={6} />
            <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{m.name}</span>
            <span
              className="rounded-[3px] border border-border px-[5px] py-px font-mono text-[10px] uppercase tracking-[0.06em]"
              style={{ color: m.roleColor ?? "var(--text-secondary)" }}
            >
              {m.roleColor ? "core" : "member"}
            </span>
            <button
              type="button"
              className="hidden h-7 rounded-sm px-2 text-[12px] text-danger transition-colors hover:bg-danger/10 group-hover:block"
            >
              Remove
            </button>
          </div>
        ))}
        {members.length === 0 && (
          <p className="py-6 text-[13px] text-text-muted">
            Members appear here once the space has activity.
          </p>
        )}
      </div>
    </div>
  );
}

/** Space integrations — GitHub connect entry point (brief §GitHub setup flow). */
function IntegrationsSettings() {
  const [connected, setConnected] = useState(false);
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between border-b border-border py-4">
        <div className="pr-6">
          <div className="flex items-center gap-2 text-[14px] text-text-primary">
            GitHub
            {connected && (
              <span className="flex h-5 items-center rounded-[3px] border border-success/30 px-2 font-mono text-[10px] uppercase tracking-[0.04em] text-success">
                connected
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[12px] text-text-muted">
            {connected
              ? "corvus/web, corvus/api — PRs and commits route to this space."
              : "Connect repositories to get a PR review feed and channel events."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConnected((v) => !v)}
          className={cn(
            "h-8 shrink-0 rounded-md px-3 text-[13px] font-medium transition-colors",
            connected
              ? "border border-border text-text-secondary hover:border-border-active hover:text-text-primary"
              : "bg-accent text-on-accent hover:bg-accent-violet-bright"
          )}
        >
          {connected ? "Disconnect" : "Connect GitHub"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-text-muted">{hint}</p>}
    </div>
  );
}

