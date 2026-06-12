import type { ChannelType } from "@/components/ui";

export type Presence = "online" | "idle" | "dnd" | "offline";

export interface SpaceSummary {
  id: string;
  name: string;
  /** Optional custom icon URL; otherwise the first letter is used. */
  icon?: string | null;
  unread?: boolean;
}

export interface ChannelSummary {
  id: string;
  name: string;
  type: ChannelType;
  unread?: boolean;
  /** For voice channels — who is currently connected. */
  participants?: { id: string; name: string; avatar?: string | null }[];
}

export interface ChannelSection {
  id: string;
  name: string;
  channels: ChannelSummary[];
}

export interface MemberRef {
  id: string;
  name: string;
  avatar?: string | null;
  presence?: Presence;
  /** Role accent color (CSS color) — shown as a 2px bar before the name. */
  roleColor?: string;
}

export interface DMSummary {
  id: string;
  name: string;
  avatar?: string | null;
  presence?: Presence;
  unreadCount?: number;
  /** Short label (e.g. "2h", "Mon") shown when there are no unreads. */
  lastLabel?: string;
  /** For group DMs — the member avatars to stack. */
  group?: { id: string; name: string; avatar?: string | null }[];
}

export interface VoiceParticipant {
  id: string;
  name: string;
  avatar?: string | null;
  speaking?: boolean;
  muted?: boolean;
  deafened?: boolean;
  /** Currently presenting their screen. */
  sharing?: boolean;
  /** Stage role — speakers are on stage, listeners in the audience. */
  role?: "speaker" | "listener";
  raisedHand?: boolean;
}

export interface FriendEntry {
  id: string;
  name: string;
  avatar?: string | null;
  presence: Presence;
  /** Custom status line, monospace tertiary. */
  status?: string;
  /** Friend-request state — absent for accepted friends. */
  pending?: "incoming" | "outgoing";
}

export type AttachmentKind = "image" | "video" | "file" | "gif";

export interface Attachment {
  kind: AttachmentKind;
  name: string;
  /** Object/remote URL — when present images and videos render inline. */
  url?: string;
  /** Human-formatted size, e.g. "2.4 MB". */
  size?: string;
}

export interface LinkEmbed {
  url: string;
  domain: string;
  title: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  author: MemberRef;
  /** ISO timestamp. */
  at: string;
  text: string;
  pinned?: boolean;
  edited?: boolean;
  /** Inline reply reference — collapses to a quiet line above the message. */
  replyTo?: { id: string; authorName: string; text: string };
  attachments?: Attachment[];
  /** Unfurled link preview card. */
  embed?: LinkEmbed;
  reactions?: { emoji: string; count: number; reacted?: boolean }[];
  /** Async video clip attached to the message (Loom-style). */
  clip?: { duration: string; size?: string };
  /** Routed GitHub event — renders as a typographic system line, not a bot message. */
  githubEvent?: { text: string; meta: string };
  /** Call history entry — logged into the conversation when a call ends. */
  call?: { kind: "voice" | "video"; duration?: string; missed?: boolean };
}

/* ── Kanban (Module: Boards) ─────────────────────────────── */

export type CardStatus = "todo" | "in-progress" | "done" | "cancelled";

export interface BoardCard {
  /** Human id, e.g. "CARD-042" — shown monospace in the backlog. */
  id: string;
  title: string;
  label?: string;
  assignee?: MemberRef;
  /** Short display date, e.g. "Jun 20". */
  dueDate?: string;
  overdue?: boolean;
  linkedPR?: number;
  commentCount?: number;
  description?: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  cards: BoardCard[];
}

export interface BoardData {
  id: string;
  name: string;
  /** e.g. "SPRINT 12 · JUN 9 – JUN 20" — monospace tertiary in the header. */
  sprint?: string;
  columns: BoardColumn[];
}

/* ── Docs ────────────────────────────────────────────────── */

export type DocBlockType =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "numbered"
  | "code"
  | "quote"
  | "callout"
  | "divider"
  | "card";

export interface DocBlock {
  id: string;
  type: DocBlockType;
  text?: string;
  /** For list blocks. */
  items?: string[];
  /** For card embeds — a kanban card id. */
  cardId?: string;
}

export interface DocSummary {
  id: string;
  title: string;
  author: MemberRef;
  /** e.g. "edited 2h ago" — monospace tertiary. */
  editedLabel: string;
}

export interface DocContent extends DocSummary {
  blocks: DocBlock[];
}

/* ── GitHub Connect ──────────────────────────────────────── */

export type PRStatus = "open" | "draft" | "review" | "merged" | "closed";
export type CIStatus = "passing" | "failing" | "pending";

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  repo: string;
  author: string;
  /** e.g. "2h ago" */
  updatedAt: string;
  status: PRStatus;
  ciStatus?: CIStatus;
  reviewCount?: number;
}

/* ── Incident channels ───────────────────────────────────── */

export type IncidentStatus = "active" | "monitoring" | "resolved";

export interface IncidentMeta {
  status: IncidentStatus;
  severity: "P0" | "P1" | "P2" | "P3";
  commander?: MemberRef;
  services: string[];
  /** e.g. "ongoing · 1h 23m" */
  duration: string;
  timeline: { at: string; text: string }[];
}
