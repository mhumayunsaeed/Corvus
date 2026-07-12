"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { X, Trash2 } from "lucide-react";
import { Avatar, ChannelGlyph, Input } from "@/shared/components/ui";
import { ConfirmModal } from "@/shared/components/ui/Modal";
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
import type { ChannelSection, MemberRef } from "./types";

/**
 * Settings (brief §Settings). Two-column layout — 240px nav + content — not a
 * modal. Rendered as a full-surface overlay inside the shell.
 */
const SECTIONS = [
  { group: "User", items: ["My Account", "Profile", "Privacy"] },
  { group: "App", items: ["Notifications", "Appearance", "Keybindings"] },
  {
    group: "Space",
    items: ["Space profile", "Channels", "Members", "Integrations", "Automations", "Webhooks", "Danger zone"],
  },
  { group: "System", items: ["Devices", "Advanced"] },
];

export function SettingsView({
  spaceName,
  sections,
  members,
  onClose,
  onRenameSpace,
  onDeleteSpace,
  onDeleteChannel,
  onAddChannel,
  onRemoveMember,
}: {
  spaceName?: string;
  /** The active space's sections — powers the Channels overview. */
  sections?: ChannelSection[];
  members?: MemberRef[];
  onClose?: () => void;
  onRenameSpace?: (name: string) => void;
  onDeleteSpace?: () => void;
  onDeleteChannel?: (channelId: string) => void;
  /** Open the add-channel dialog for a section. */
  onAddChannel?: (sectionId: string) => void;
  onRemoveMember?: (memberId: string) => void;
}) {
  const [active, setActive] = useState("My Account");

  return (
    <div role="dialog" aria-modal="true" aria-label="Settings" className="absolute inset-0 z-40 flex bg-background">
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
            <SpaceProfileSettings spaceName={spaceName} onRename={onRenameSpace} />
          ) : active === "Channels" ? (
            <ChannelsSettings
              sections={sections ?? []}
              onDeleteChannel={onDeleteChannel}
              onAddChannel={onAddChannel}
            />
          ) : active === "Members" ? (
            <MembersSettings members={members ?? []} onRemove={onRemoveMember} />
          ) : active === "Danger zone" ? (
            <DangerZoneSettings spaceName={spaceName} onDeleteSpace={onDeleteSpace} />
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
function SpaceProfileSettings({
  spaceName,
  onRename,
}: {
  spaceName?: string;
  onRename?: (name: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(spaceName ?? "Space");
  const [saved, setSaved] = useState(false);
  const invite = "https://corvus.app/join/3f9a2c";
  const dirty = name.trim() !== (spaceName ?? "Space") && name.trim().length > 0;
  return (
    <div className="mt-6 flex flex-col gap-6">
      <Field label="Space name" hint="Shown in the rail and at the top of the panel.">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              onRename?.(name.trim());
              setSaved(true);
              setTimeout(() => setSaved(false), 1500);
            }}
            className={cn(
              "h-9 shrink-0 rounded-md px-3 text-[13px] font-medium transition-colors",
              dirty
                ? "bg-accent text-on-accent hover:bg-accent-violet-bright"
                : "border border-border text-text-faint"
            )}
          >
            {saved ? "Saved" : "Save"}
          </button>
        </div>
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

/** Channels overview — every section and channel, with add and delete. */
function ChannelsSettings({
  sections,
  onDeleteChannel,
  onAddChannel,
}: {
  sections: ChannelSection[];
  onDeleteChannel?: (channelId: string) => void;
  onAddChannel?: (sectionId: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  return (
    <div className="mt-6 flex flex-col gap-6">
      <ConfirmModal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDeleteChannel?.(pendingDelete.id);
          setPendingDelete(null);
        }}
        title={`Delete #${pendingDelete?.name ?? "channel"}?`}
        body="All messages and channel data will be permanently deleted."
        confirmLabel="Delete channel"
        destructive
      />
      {sections.map((section) => (
        <div key={section.id}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
              {section.name} — {section.channels.length}
            </p>
            {onAddChannel && (
              <button
                type="button"
                onClick={() => onAddChannel(section.id)}
                className="h-6 rounded-sm px-2 text-[12px] text-text-secondary transition-colors hover:bg-hover-row hover:text-text-primary"
              >
                + Add channel
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-col">
            {section.channels.map((ch) => (
              <div
                key={ch.id}
                className="group flex h-10 items-center gap-2.5 border-b border-border px-1 transition-colors last:border-b-0 hover:bg-hover-row"
              >
                <ChannelGlyph type={ch.type} size={14} />
                <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{ch.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-faint">
                  {ch.type}
                </span>
                {onDeleteChannel && (
                  <button
                    type="button"
                    aria-label={`Delete ${ch.name}`}
                    onClick={() => setPendingDelete({ id: ch.id, name: ch.name })}
                    className="hidden h-7 w-7 items-center justify-center rounded-sm text-danger transition-colors hover:bg-danger/10 group-hover:flex group-focus-within:flex focus:flex"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {sections.length === 0 && (
        <p className="text-[13px] text-text-muted">Open a space to manage its channels.</p>
      )}
    </div>
  );
}

/** Danger zone — destructive space actions, kept behind an explicit confirm. */
function DangerZoneSettings({
  spaceName,
  onDeleteSpace,
}: {
  spaceName?: string;
  onDeleteSpace?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-6">
      <div className="rounded-[10px] border border-danger/30 p-4">
        <p className="text-[14px] font-medium text-text-primary">Delete this space</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
          Removes {spaceName ?? "this space"} and all of its channels from your workspace. This
          cannot be undone.
        </p>
        {confirming ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onDeleteSpace}
              className="h-8 rounded-md bg-danger px-3 text-[13px] font-medium text-white transition-colors hover:bg-danger/85"
            >
              Yes, delete {spaceName ?? "space"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-8 rounded-md border border-border px-3 text-[13px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-3 h-8 rounded-md border border-danger/40 px-3 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
          >
            Delete space
          </button>
        )}
      </div>
    </div>
  );
}

/** Space members — roles as quiet mono chips, actions on hover. */
function MembersSettings({
  members,
  onRemove,
}: {
  members: MemberRef[];
  onRemove?: (memberId: string) => void;
}) {
  const [pendingRemove, setPendingRemove] = useState<MemberRef | null>(null);
  return (
    <div className="mt-6">
      <ConfirmModal
        open={Boolean(pendingRemove)}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) onRemove?.(pendingRemove.id);
          setPendingRemove(null);
        }}
        title={`Remove ${pendingRemove?.name ?? "member"}?`}
        body="They will lose access to this space until invited again."
        confirmLabel="Remove member"
        destructive
      />
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
              onClick={() => setPendingRemove(m)}
              className="hidden h-7 rounded-sm px-2 text-[12px] text-danger transition-colors hover:bg-danger/10 group-hover:block group-focus-within:block focus:block"
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
