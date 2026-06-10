"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { X } from "lucide-react";
import { Input, Toggle } from "@/components/ui";

/**
 * Settings (brief §Settings). Two-column layout — 240px nav + content — not a
 * modal. Rendered as a full-surface overlay inside the shell.
 */
const SECTIONS = [
  { group: "User", items: ["My Account", "Profile", "Privacy"] },
  { group: "App", items: ["Notifications", "Appearance", "Keybindings"] },
  { group: "System", items: ["Devices", "Advanced"] },
];

export function SettingsView({ onClose }: { onClose?: () => void }) {
  const [active, setActive] = useState("My Account");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [compact, setCompact] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

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

          {active === "Profile" || active === "My Account" ? (
            <div className="mt-6 flex flex-col gap-6">
              <Field label="Display name" hint="Shown next to your messages.">
                <Input defaultValue="you" />
              </Field>
              <Field label="Username" hint="This is how others find you.">
                <Input defaultValue="you" />
              </Field>
              <Field label="Email" hint="Used for sign-in and recovery.">
                <Input defaultValue="you@example.com" type="email" />
              </Field>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-1">
              <ToggleRow
                label="Compact message layout"
                hint="Tighter spacing between messages."
                checked={compact}
                onChange={setCompact}
              />
              <ToggleRow
                label="Send read receipts"
                hint="Let others see when you've read their messages."
                checked={readReceipts}
                onChange={setReadReceipts}
              />
              <ToggleRow
                label="Reduce motion"
                hint="Minimise non-essential animations."
                checked={reduceMotion}
                onChange={setReduceMotion}
              />
            </div>
          )}
        </div>
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

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-4">
      <div className="pr-6">
        <div className="text-[14px] text-text-primary">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] text-text-muted">{hint}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}
