"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { Plus, Trash2 } from "lucide-react";

const TRIGGERS = [
  "PR merged",
  "PR opened",
  "PR review requested",
  "Card moved",
  "Card created",
  "Message posted in channel",
  "User joins space",
];

const ACTIONS = [
  "Move card to column",
  "Send message to channel",
  "Notify user",
  "Create card",
  "Archive card",
  "Run webhook (POST to URL)",
];

interface Rule {
  id: string;
  trigger: string;
  condition?: string;
  action: string;
}

/**
 * Automations (brief §Automations) — a lightweight rule engine surfaced in
 * Space Settings. Rules read as a sentence: WHEN · IF · THEN.
 */
export function AutomationsSettings() {
  const [rules, setRules] = useState<Rule[]>([
    { id: "r1", trigger: "PR merged", action: "Move card to column", condition: "column = In progress" },
    { id: "r2", trigger: "Card moved", action: "Send message to channel", condition: "to Done" },
  ]);
  const [building, setBuilding] = useState(false);
  const [trigger, setTrigger] = useState(TRIGGERS[0]);
  const [action, setAction] = useState(ACTIONS[0]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-secondary">
          Rules run on this space. Triggers come from GitHub, boards, and channels.
        </p>
        <button
          type="button"
          onClick={() => setBuilding((v) => !v)}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
        >
          <Plus size={14} /> New rule
        </button>
      </div>

      {building && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-surface-raised p-4">
          <Keyword>When</Keyword>
          <RuleSelect value={trigger} options={TRIGGERS} onChange={setTrigger} />
          <Keyword>· then</Keyword>
          <RuleSelect value={action} options={ACTIONS} onChange={setAction} />
          <button
            type="button"
            onClick={() => {
              setRules((r) => [...r, { id: `r${Date.now()}`, trigger, action }]);
              setBuilding(false);
            }}
            className="ml-auto h-8 rounded-md border border-border px-3 text-[13px] text-text-primary transition-colors hover:border-border-active"
          >
            Save rule
          </button>
        </div>
      )}

      <div className="mt-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="group flex h-11 items-center gap-2 border-b border-border px-1 transition-colors hover:bg-hover-row"
          >
            <span className="text-[13px] text-text-primary">
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-muted">When </span>
              {rule.trigger}
              {rule.condition && (
                <>
                  <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-muted"> if </span>
                  {rule.condition}
                </>
              )}
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-muted"> → </span>
              {rule.action}
            </span>
            <button
              type="button"
              aria-label="Delete rule"
              onClick={() => setRules((r) => r.filter((x) => x.id !== rule.id))}
              className="ml-auto hidden h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-danger group-hover:flex"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Keyword({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">{children}</span>
  );
}

function RuleSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-border bg-surface-input px-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-active"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/**
 * Webhooks (brief §Automations) — inbound URL + outbound payload template.
 * No visual JSON builder; a monospace textarea. Developers know what a
 * webhook is.
 */
export function WebhooksSettings() {
  const [payload, setPayload] = useState(
    `{\n  "event": "{{event}}",\n  "channel": "{{channel}}",\n  "actor": "{{actor}}",\n  "url": "{{url}}"\n}`
  );

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div>
        <SettingLabel>Inbound webhook</SettingLabel>
        <p className="mt-1 text-[12px] text-text-muted">
          POST JSON here — it routes to a channel as a formatted event.
        </p>
        <code className="mt-2 block truncate rounded-md border border-border bg-surface-raised px-3 py-2.5 font-mono text-[12px] text-text-secondary">
          https://corvus.app/hooks/s1/whk_3f9a2c81d6
        </code>
      </div>

      <div>
        <SettingLabel>Outbound payload template</SettingLabel>
        <p className="mt-1 text-[12px] text-text-muted">
          Sent by “Run webhook” actions. Raw JSON with {"{{variable}}"} interpolation.
        </p>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={7}
          spellCheck={false}
          className="mt-2 w-full resize-y rounded-md border border-border bg-surface-input p-3 font-mono text-[12px] leading-[1.6] text-text-primary outline-none transition-colors focus:border-border-active"
        />
      </div>

      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div>
          <SettingLabel>URL</SettingLabel>
          <input
            placeholder="https://example.com/hook"
            className="mt-2 h-9 w-full rounded-md border border-border bg-surface-input px-3 font-mono text-[12px] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-border-active"
          />
        </div>
        <div>
          <SettingLabel>Method</SettingLabel>
          <select className="mt-2 h-9 w-full rounded-md border border-border bg-surface-input px-2 font-mono text-[12px] text-text-primary outline-none">
            <option>POST</option>
            <option>PUT</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function SettingLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={cn("font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary")}>
      {children}
    </p>
  );
}
