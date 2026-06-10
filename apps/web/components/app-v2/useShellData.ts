"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import type {
  ChannelData,
  DMConversationData,
  MessageData,
  ServerData,
} from "@/lib/api";
import type { ChannelType } from "@/components/ui";
import type { AppShellData } from "./AppShell";
import type { ChatMessage, DMSummary, MemberRef, Presence } from "./types";
import { SAMPLE_DATA } from "./sample-data";

function toChannelType(type: string): ChannelType {
  switch (type) {
    case "voice":
      return "voice";
    case "stage":
      return "stage";
    case "announcement":
      return "announcement";
    default:
      return "text";
  }
}

function toPresence(status: string | undefined): Presence {
  switch (status) {
    case "online":
      return "online";
    case "idle":
      return "idle";
    case "dnd":
      return "dnd";
    default:
      return "offline";
  }
}

function toMessage(m: MessageData): ChatMessage {
  return {
    id: m.id,
    author: {
      id: m.author.id,
      name: m.author.displayName || m.author.username,
      avatar: m.author.avatarUrl,
      presence: toPresence(m.author.status),
    },
    at: m.createdAt,
    text: m.content,
    reactions: m.reactions?.map((r) => ({ emoji: r.emoji, count: r.count, reacted: r.reacted })),
  };
}

function buildSections(channels: ChannelData[]) {
  const byCategory = new Map<string, ChannelData[]>();
  for (const ch of [...channels].sort((a, b) => a.position - b.position)) {
    const key = ch.category || "Channels";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(ch);
  }
  return Array.from(byCategory.entries()).map(([name, chans]) => ({
    id: name,
    name,
    channels: chans.map((c) => ({ id: c.id, name: c.name, type: toChannelType(c.type) })),
  }));
}

function dmToSummary(c: DMConversationData, meId: string): DMSummary {
  const others = c.participants.filter((p) => p.id !== meId);
  const primary = others[0];
  const name =
    c.name ?? (c.type === "group" ? others.map((p) => p.displayName).join(", ") : primary?.displayName ?? "Direct");
  return {
    id: c.id,
    name,
    avatar: primary?.avatarUrl,
    presence: toPresence(primary?.status),
    lastLabel: c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : undefined,
    group:
      c.type === "group"
        ? others.slice(0, 2).map((p) => ({ id: p.id, name: p.displayName, avatar: p.avatarUrl }))
        : undefined,
  };
}

/**
 * Maps the live Corvus stores to the presentational AppShellData. Falls back to
 * the design sample when the user is logged out or the stores are empty, so the
 * /spaces preview always renders something. This is the seam between the new
 * design surface and the existing data layer.
 */
export function useShellData(): { data: AppShellData; live: boolean } {
  const user = useAuthStore((s) => s.user);
  const servers = useAppStore((s) => s.servers);
  const channelsByServer = useAppStore((s) => s.channelsByServer);
  const channels = useAppStore((s) => s.channels);
  const activeServerId = useAppStore((s) => s.activeServerId);
  const dmConversations = useAppStore((s) => s.dmConversations);
  const chatMessages = useChatStore((s) => s.messages);

  return useMemo(() => {
    if (!user || servers.length === 0) {
      return { data: SAMPLE_DATA, live: false };
    }

    const sectionsBySpace: AppShellData["sectionsBySpace"] = {};
    for (const server of servers as ServerData[]) {
      const chans = channelsByServer[server.id] ?? (server.id === activeServerId ? channels : []);
      sectionsBySpace[server.id] = buildSections(chans);
    }

    const messagesByChannel: AppShellData["messagesByChannel"] = {};
    for (const [channelId, msgs] of Object.entries(chatMessages)) {
      messagesByChannel[channelId] = msgs.map(toMessage);
    }

    // Members aren't held in a store — approximate from message authors so the
    // member panel is populated for channels the user has opened.
    const membersBySpace: AppShellData["membersBySpace"] = {};
    for (const server of servers) {
      const chans = channelsByServer[server.id] ?? [];
      const seen = new Map<string, MemberRef>();
      for (const ch of chans) {
        for (const m of chatMessages[ch.id] ?? []) {
          if (!seen.has(m.author.id)) {
            seen.set(m.author.id, {
              id: m.author.id,
              name: m.author.displayName || m.author.username,
              avatar: m.author.avatarUrl,
              presence: toPresence(m.author.status),
            });
          }
        }
      }
      membersBySpace[server.id] = Array.from(seen.values());
    }

    const data: AppShellData = {
      me: {
        id: user.id,
        name: user.displayName || user.username,
        avatar: user.avatar,
        presence: toPresence(user.status === "invisible" ? "offline" : user.status),
        statusText: user.status === "invisible" ? "offline" : user.status,
      },
      spaces: servers.map((s) => ({ id: s.id, name: s.name, icon: s.iconUrl })),
      sectionsBySpace,
      messagesByChannel,
      membersBySpace,
      dmConversations: dmConversations.map((c) => dmToSummary(c, user.id)),
    };

    return { data, live: true };
  }, [user, servers, channelsByServer, channels, activeServerId, dmConversations, chatMessages]);
}
