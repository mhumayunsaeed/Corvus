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
}

export interface ChatMessage {
  id: string;
  author: MemberRef;
  /** ISO timestamp. */
  at: string;
  text: string;
  reactions?: { emoji: string; count: number; reacted?: boolean }[];
}
