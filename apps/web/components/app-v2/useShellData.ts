"use client";

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { useWorkspaceStore, type WorkspaceState } from "@/stores/workspace-store";
import type {
  ChannelData,
  DMConversationData,
  MessageData,
  ServerData,
} from "@/lib/api";
import type { ChannelType } from "@/components/ui";
import type { AppShellData } from "./AppShell";
import type { ChatMessage, DMSummary, MemberRef, Presence, FriendEntry } from "./types";
import { SAMPLE_DATA } from "./sample-data";

/**
 * Layer locally-created workspace entities (spaces, channels, group DMs,
 * friend-request state) over the base shell data — same idea as the chat echo
 * layers, but for structure.
 */
function applyWorkspace(
  base: AppShellData,
  ws: WorkspaceState,
  options: { includeLocalFriends?: boolean } = {}
): AppShellData {
  const removedSpaces = new Set(ws.removedSpaceIds);
  const removedChannels = new Set(ws.removedChannelIds);

  const spaces = [...base.spaces, ...ws.localSpaces]
    .filter((s) => !removedSpaces.has(s.id))
    .map((s) => (ws.spaceRenames[s.id] ? { ...s, name: ws.spaceRenames[s.id] } : s));

  const sectionsBySpace: AppShellData["sectionsBySpace"] = {
    ...base.sectionsBySpace,
    ...ws.localSections,
  };
  for (const { spaceId, section } of ws.addedSections) {
    sectionsBySpace[spaceId] = [...(sectionsBySpace[spaceId] ?? []), section];
  }
  const mergedSections: AppShellData["sectionsBySpace"] = {};
  for (const [spaceId, sections] of Object.entries(sectionsBySpace)) {
    mergedSections[spaceId] = sections.map((sec) => {
      const added = ws.addedChannels
        .filter((a) => a.spaceId === spaceId && a.sectionId === sec.id)
        .map((a) => a.channel);
      return {
        ...sec,
        channels: [...sec.channels, ...added].filter((c) => !removedChannels.has(c.id)),
      };
    });
  }

  const localFriends = options.includeLocalFriends === false ? [] : ws.addedFriends;
  const friendStates = options.includeLocalFriends === false ? {} : ws.friendStates;
  const friends = [...(base.friends ?? []), ...localFriends]
    .filter((f) => friendStates[f.id] !== "removed")
    .map((f) => (friendStates[f.id] === "accepted" ? { ...f, pending: undefined } : f));

  // My status propagates everywhere I appear: the dock, member lists, feeds.
  const me = ws.myStatus
    ? {
        ...base.me,
        presence: ws.myStatus.presence,
        statusText: ws.myStatus.text || ws.myStatus.presence,
      }
    : base.me;

  const membersBySpace: AppShellData["membersBySpace"] = {};
  for (const [spaceId, members] of Object.entries(base.membersBySpace)) {
    const removed = new Set(ws.removedMembers[spaceId] ?? []);
    membersBySpace[spaceId] = members
      .filter((m) => !removed.has(m.id))
      .map((m) => (ws.myStatus && m.id === base.me.id ? { ...m, presence: ws.myStatus.presence } : m));
  }

  return {
    ...base,
    me,
    spaces,
    sectionsBySpace: mergedSections,
    dmConversations: [...ws.localConvos, ...(base.dmConversations ?? [])],
    friends,
    membersBySpace,
    boardsByChannel: { ...base.boardsByChannel, ...ws.localBoards, ...ws.boardOverrides },
    docsByChannel: { ...base.docsByChannel, ...ws.docsOverrides },
    incidentsByChannel: {
      ...base.incidentsByChannel,
      ...ws.localIncidents,
      ...ws.incidentOverrides,
    },
    prsByChannel: { ...base.prsByChannel, ...ws.localPRs },
  };
}

function toChannelType(type: string): ChannelType {
  switch (type) {
    case "voice":
      return "voice";
    case "stage":
      return "stage";
    case "announcement":
      return "announcement";
    case "board":
      return "board";
    case "docs":
      return "docs";
    case "canvas":
      return "canvas";
    case "github":
      return "github";
    case "incident":
      return "incident";
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
    peerId: c.type === "direct" ? primary?.id : undefined,
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
export function useShellData(forceDemo = false): { data: AppShellData; live: boolean } {
  const user = useAuthStore((s) => s.user);
  const servers = useAppStore((s) => s.servers);
  const channelsByServer = useAppStore((s) => s.channelsByServer);
  const channels = useAppStore((s) => s.channels);
  const activeServerId = useAppStore((s) => s.activeServerId);
  const dmConversations = useAppStore((s) => s.dmConversations);
  const workspaceModules = useAppStore((s) => s.workspaceModules);
  const chatMessages = useChatStore((s) => s.messages);
  const workspace = useWorkspaceStore();
  const liveFriends = useAppStore((s) => s.friends);

  // skipHydration store — load persisted creations after mount (SSR-safe).
  useEffect(() => {
    void useWorkspaceStore.persist.rehydrate();
  }, []);

  return useMemo(() => {
    if (forceDemo || !user) {
      return { data: applyWorkspace(SAMPLE_DATA, workspace), live: false };
    }

    const sectionsBySpace: AppShellData["sectionsBySpace"] = {};
    for (const server of servers as ServerData[]) {
      const chans = channelsByServer[server.id] ?? (server.id === activeServerId ? channels : []);
      sectionsBySpace[server.id] = buildSections(chans);
    }

    let friendsList: FriendEntry[] = [];
    if (liveFriends) {
      const accepted: FriendEntry[] = liveFriends.friends.map((f) => ({
        id: f.user.id,
        name: f.user.displayName || f.user.username,
        avatar: f.user.avatarUrl,
        presence: toPresence(f.user.status),
        status: f.user.bio || undefined,
      }));

      const pendingIncoming: FriendEntry[] = liveFriends.pendingIncoming.map((r) => ({
        id: r.id,
        name: r.user.displayName || r.user.username,
        avatar: r.user.avatarUrl,
        presence: toPresence(r.user.status),
        pending: "incoming",
      }));

      const pendingOutgoing: FriendEntry[] = liveFriends.pendingOutgoing.map((r) => ({
        id: r.id,
        name: r.user.displayName || r.user.username,
        avatar: r.user.avatarUrl,
        presence: toPresence(r.user.status),
        pending: "outgoing",
      }));

      friendsList = [...accepted, ...pendingIncoming, ...pendingOutgoing];
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
      friends: friendsList,
      boardsByChannel: workspaceModules.boardsByChannel as AppShellData["boardsByChannel"],
      docsByChannel: workspaceModules.docsByChannel as AppShellData["docsByChannel"],
      incidentsByChannel: workspaceModules.incidentsByChannel as AppShellData["incidentsByChannel"],
      prsByChannel: workspaceModules.prsByChannel as AppShellData["prsByChannel"],
    };

    return { data: applyWorkspace(data, workspace, { includeLocalFriends: false }), live: true };
  }, [
    user,
    servers,
    channelsByServer,
    channels,
    activeServerId,
    dmConversations,
    chatMessages,
    workspaceModules,
    workspace,
    liveFriends,
  ]);
}
