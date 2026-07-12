import { notFound } from "next/navigation";
import { MarketingPage, type MarketingPageContent } from "@/features/landing/components/MarketingPage";

const PAGES: Record<string, MarketingPageContent> = {
  messaging: {
    eyebrow: "Product · Messaging",
    title: "Messaging that keeps up with your team.",
    lede:
      "Real-time channels, threads, and direct messages organized by space, with reactions, search, attachments, pins and presence.",
    blocks: [
      { kind: "h2", text: "Channels that stay readable" },
      {
        kind: "p",
        text:
          "Corvus channels are built for high-throughput engineering conversation. Messages group by author and time, dates separate naturally, and metadata stays out of the way in monospace. No avatars shouting for attention, no embeds taking over the feed.",
      },
      {
        kind: "ul",
        items: [
          "Threads keep deep dives out of the main feed without hiding them.",
          "Reactions, mentions, and pins work the way you expect.",
          "Markdown everywhere: code blocks, inline code, quotes, and links.",
          "Edit and delete events are synchronized through the current realtime layer.",
        ],
      },
      { kind: "h2", text: "Realtime by design" },
      {
        kind: "p",
        text:
          "Messaging uses Supabase Realtime Broadcast and Presence. The interface renders new messages optimistically and reconciles them with server state while presence keeps the channel aware of who is connected.",
      },
      { kind: "h2", text: "Encryption status" },
      {
        kind: "p",
        text:
          "End-to-end encryption for direct messages is planned roadmap work and is not presented as available today. Current deployments should use the security controls provided by Supabase and their chosen infrastructure.",
      },
      {
        kind: "note",
        text:
          "Everything in messaging is available over the API — send, edit, react, and search programmatically with the same permissions as the signed-in user.",
      },
    ],
  },
  voice: {
    eyebrow: "Product · Voice & Video",
    title: "Voice rooms, video calls, and stages.",
    lede:
      "Drop-in voice channels, calls, screen sharing, and stage surfaces, with media infrastructure powered by LiveKit.",
    blocks: [
      { kind: "h2", text: "Voice channels" },
      {
        kind: "p",
        text:
          "Join a voice channel with one click and see who's talking at a glance — a calm speaking ring around the avatar, mute and deafen states inline, with clear connection state. Voice participants appear in the sidebar so the rest of the team knows where the conversation is.",
      },
      { kind: "h2", text: "Calls and screen sharing" },
      {
        kind: "ul",
        items: [
          "1:1 and group calls from any DM, with ringtones you can actually stand.",
          "Screen share with a presenter label and a proper stage view — content fits, never crops.",
          "Camera tiles glow softly when someone speaks, so you always know who has the floor.",
          "Media behaviour depends on the configured LiveKit deployment and client network.",
        ],
      },
      { kind: "h2", text: "Stages for announcements" },
      {
        kind: "p",
        text:
          "Stage channels separate speakers from listeners for all-hands, AMAs, and community events. Listeners raise a hand to request the mic; moderators promote and demote without interrupting the stream.",
      },
      { kind: "h2", text: "Async clips" },
      {
        kind: "p",
        text:
          "Not everything needs a meeting. Record a quick clip — screen, camera, or both — and drop it into any channel. Teammates watch on their own time, at their own speed.",
      },
    ],
  },
  kanban: {
    eyebrow: "Product · Kanban",
    title: "Project boards where the work happens.",
    lede:
      "Boards, cards, assignees, labels, and due dates — living next to your channels instead of in a separate tab you forget to open.",
    blocks: [
      { kind: "h2", text: "Boards built into the workspace" },
      {
        kind: "p",
        text:
          "A board is a channel type. It lives in your space's sidebar next to the conversation about it, and it remains close to the conversation that gives it context.",
      },
      {
        kind: "ul",
        items: [
          "Board view for the sprint, backlog view for the queue, timeline for due dates.",
          "Drag cards between columns; status follows automatically.",
          "Labels, assignees, due dates, and comment threads on every card.",
          "Card IDs are stable and linkable — reference CARD-042 from any message or doc.",
        ],
      },
      { kind: "h2", text: "Connected to your code" },
      {
        kind: "p",
        text:
          "Link a pull request to a card and the card shows the PR's CI status and review state. Configure a column to auto-close on merge and your board updates itself the moment the work actually ships.",
      },
      { kind: "h2", text: "Automate the busywork" },
      {
        kind: "p",
        text:
          "Rules read like a sentence: when a PR merges, move the card to Done. When a card enters In Progress, notify the channel. Build them in Space Settings → Automations — no YAML required.",
      },
      {
        kind: "code",
        title: "Create cards from code",
        code: `await client.board('sprint-12').cards.create({
  title:    'Review authentication flow',
  assignee: 'humayun',
  due:      '2026-06-20',
  linkedPR: 42,
})`,
      },
    ],
  },
  docs: {
    eyebrow: "Product · Docs",
    title: "A knowledge layer, not a second wiki.",
    lede:
      "Channel-linked documents with a fast block editor — runbooks, RFCs, and onboarding guides that live where the team already works.",
    blocks: [
      { kind: "h2", text: "Documents next to the discussion" },
      {
        kind: "p",
        text:
          "Docs channels hold the written knowledge of a space. The decision gets made in the channel; the doc that records it lives one click away, in the same sidebar, with the same search.",
      },
      { kind: "h2", text: "A focused editor" },
      {
        kind: "p",
        text:
          "Type “/” to insert blocks: headings, lists, code, quotes, callouts, dividers — and kanban card embeds that stay live as the card moves. The editor is a 720px reading column with nothing floating over your text.",
      },
      {
        kind: "ul",
        items: [
          "Headings, bullet and numbered lists, blockquotes, and dividers.",
          "Code blocks in monospace with proper horizontal scrolling.",
          "Callouts for the one paragraph everyone must read.",
          "Embed a card by ID — the chip shows its current title and column.",
        ],
      },
      { kind: "h2", text: "Versioned and searchable" },
      {
        kind: "p",
        text:
          "Every doc shows its author and last-edited time. Full-text search covers doc titles and bodies along with messages, cards, and PRs — one search box for everything the team knows.",
      },
    ],
  },
  github: {
    eyebrow: "Product · GitHub Connect",
    title: "Your repos, as a native surface.",
    lede:
      "A pull-request feed inside your space, commit events in your channels, and PR links on your kanban cards — GitHub integration that's part of the workspace, not a bot.",
    blocks: [
      { kind: "h2", text: "The PR review feed" },
      {
        kind: "p",
        text:
          "Connect repositories to a space and get a Pull Requests channel: every open PR with its status, CI state, review count, and age — filterable by what needs your attention. No more tab-cycling through repo notification pages.",
      },
      {
        kind: "ul",
        items: [
          "Filters: all, needs review, changes requested, approved, merged.",
          "Status dots and CI badges readable at a glance.",
          "Click through to the PR, or link it to a card without leaving the feed.",
        ],
      },
      { kind: "h2", text: "Events in channels, not bot spam" },
      {
        kind: "p",
        text:
          "Merges, opens, and review requests route to the channels you choose — rendered as a quiet, monospace system line aligned with the conversation, not a bot account with an avatar and an embed.",
      },
      { kind: "h2", text: "Closing the loop with boards" },
      {
        kind: "p",
        text:
          "Link PR #42 to CARD-042 and the card carries the PR's CI status. When the PR merges, an automation can move the card to Done. The board reflects reality without anyone updating it.",
      },
      {
        kind: "note",
        text:
          "The current demo includes a GitHub work surface. Production integration setup is still evolving and should be verified against repository releases.",
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = PAGES[slug];
  if (!content) notFound();
  return <MarketingPage content={content} />;
}
