import { MarketingPage, type MarketingPageContent } from "@/components/landing/MarketingPage";

const content: MarketingPageContent = {
  eyebrow: "Developers · Changelog",
  title: "Changelog.",
  lede: "What shipped, when, and what it changes. New entries land with every release.",
  blocks: [
    { kind: "h2", text: "v1.3.0 — June 2026" },
    {
      kind: "ul",
      items: [
        "Kanban boards: board, backlog, and timeline views; drag-and-drop columns; card detail panel with status, labels, due dates, and linked PRs.",
        "Docs: channel-linked documents with a slash-command block editor — headings, lists, code, callouts, and live kanban card embeds.",
        "GitHub Connect: PR review feed with CI badges, channel event lines, and auto-close-on-merge board automation.",
        "Automations: WHEN / IF / THEN rules with inbound and outbound webhooks.",
        "Async clips: record screen or camera and post the clip inline in any channel.",
        "Incident channels: structured headers, severity, commander, and an auto-built timeline.",
        "Workspace search: messages, cards, docs, files, and PRs from one panel (Ctrl+F).",
        "Admin panel and a four-step first-run setup wizard for self-hosted instances.",
      ],
    },
    { kind: "h2", text: "v1.2.4 — May 2026" },
    {
      kind: "ul",
      items: [
        "New sound engine: synthesized ringtones and notification tones, selectable per event, with volume control.",
        "Call UI refresh: speaking rings, connection quality pill, redesigned incoming-call card.",
        "Fixed reaction and edit latency on busy channels.",
        "Faster space switching and cold reloads.",
      ],
    },
    { kind: "h2", text: "v1.2.0 — April 2026" },
    {
      kind: "ul",
      items: [
        "Workspace redesign: the three-column shell — nav rail, space panel, main area.",
        "Dark and light themes from one semantic token system.",
        "Command palette (Ctrl+K) for navigation and quick actions.",
        "Desktop app updated to Tauri 2 — installer now ~10 MB.",
      ],
    },
    { kind: "h2", text: "v1.1.0 — February 2026" },
    {
      kind: "ul",
      items: [
        "Stage channels with raise-hand moderation.",
        "Message threads and pinned messages.",
        "Self-hosting: ARM64 images and Raspberry Pi support.",
      ],
    },
  ],
};

export default function ChangelogPage() {
  return <MarketingPage content={content} />;
}
