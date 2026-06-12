"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NavRail } from "./NavRail";
import { SpacePanel } from "./SpacePanel";
import { DMPanel } from "./DMPanel";
import { MessageArea } from "./MessageArea";
import { MemberPanel } from "./MemberPanel";
import { ThreadPanel } from "./ThreadPanel";
import { VoiceView } from "./VoiceView";
import { SettingsView } from "./SettingsView";
import { BoardView } from "./BoardView";
import { DocsView } from "./DocsView";
import { GitHubView } from "./GitHubView";
import { CanvasView } from "./CanvasView";
import { IncidentView } from "./IncidentView";
import { SearchPanel, type SearchCorpus } from "./SearchPanel";
import { ClipRecorder } from "./ClipRecorder";
import { HomeView } from "./HomeView";
import { StageView } from "./StageView";
import { PinnedPanel } from "./PinnedPanel";
import { CallSession, IncomingCallCard, type ActiveCall, type CallPeer } from "./CallUI";
import {
  AddChannelDialog,
  AddSectionDialog,
  CreateSpaceDialog,
  NewGroupDialog,
  type SpaceTemplate,
} from "./CreateDialogs";
import { ToastViewport } from "@/components/ui/Toast";
import type { ChannelType } from "@/components/ui";
import { useToastStore } from "@/stores/toast-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useChatStore } from "@/stores/chat-store";
import {
  createChannel as createChannelApi,
  createServer,
  deleteChannel as deleteChannelApi,
  deleteServer as deleteServerApi,
  fetchWorkspaceModules,
  pinChannelMessage,
  saveBoardState,
  saveDocsState,
  saveGitHubState,
  saveIncidentState,
  sendDMMessage,
  sendMessage as sendChannelMessageApi,
  unpinChannelMessage,
  updateServer as updateServerApi,
  addReaction as addChannelReactionApi,
  removeReaction as removeChannelReactionApi,
  sendFriendRequest as sendFriendRequestApi,
  acceptFriendRequest as acceptFriendRequestApi,
  declineFriendRequest as declineFriendRequestApi,
  cancelFriendRequest as cancelFriendRequestApi,
  removeFriend as removeFriendApi,
  fetchFriendDashboard,
} from "@/lib/api";
import { notifyEvent, ringIncoming } from "@/lib/notify";
import type {
  BoardData,
  ChannelSection,
  ChatMessage,
  DMSummary,
  DocContent,
  FriendEntry,
  IncidentMeta,
  MemberRef,
  Presence,
  PullRequest,
  SpaceSummary,
  VoiceParticipant,
} from "./types";

/* Seeds for locally-created module channels. */
function emptyBoard(id: string, name: string): BoardData {
  return {
    id,
    name,
    columns: [
      { id: `${id}-todo`, title: "Todo", cards: [] },
      { id: `${id}-doing`, title: "In progress", cards: [] },
      { id: `${id}-done`, title: "Done", cards: [] },
    ],
  };
}

function newIncident(): IncidentMeta {
  return {
    status: "active",
    severity: "P3",
    services: [],
    duration: "just opened",
    timeline: [
      {
        at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: "Incident channel created",
      },
    ],
  };
}

function fmtCallDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Demo feed for freshly-connected GitHub channels (the realtime seam). */
function seedPRs(): PullRequest[] {
  const t = Date.now();
  return [
    { id: `pr-${t}-1`, number: 128, title: "Wire presence updates through the gateway", repo: "corvus/web", author: "maya", updatedAt: "just now", status: "review", ciStatus: "passing", reviewCount: 2 },
    { id: `pr-${t}-2`, number: 127, title: "Fix reconnect backoff jitter", repo: "corvus/gateway", author: "alex", updatedAt: "1h ago", status: "open", ciStatus: "pending" },
    { id: `pr-${t}-3`, number: 125, title: "Board column reorder + drag affordances", repo: "corvus/web", author: "jun", updatedAt: "3h ago", status: "merged", ciStatus: "passing", reviewCount: 3 },
  ];
}

export interface AppShellData {
  me: MemberRef & { statusText?: string };
  spaces: SpaceSummary[];
  /** spaceId → sections of channels */
  sectionsBySpace: Record<string, ChannelSection[]>;
  /** channelId (or DM conversation id) → messages */
  messagesByChannel: Record<string, ChatMessage[]>;
  /** spaceId → members */
  membersBySpace: Record<string, MemberRef[]>;
  /** voice channelId → live participants */
  voiceByChannel?: Record<string, VoiceParticipant[]>;
  /** DM conversations for DM mode */
  dmConversations?: DMSummary[];
  /** board channelId → board */
  boardsByChannel?: Record<string, BoardData>;
  /** docs channelId → documents */
  docsByChannel?: Record<string, DocContent[]>;
  /** github channelId → pull requests */
  prsByChannel?: Record<string, PullRequest[]>;
  /** incident channelId → incident metadata */
  incidentsByChannel?: Record<string, IncidentMeta>;
  /** Friends list (home + DM surface). */
  friends?: FriendEntry[];
}

export interface AppShellControl {
  activeSpaceId?: string;
  activeChannelId?: string;
  /** Which surface the URL targets. When set, the URL is the source of truth. */
  view?: "home" | "dms" | "space";
  /** DM conversation targeted by the URL (view === "dms"). */
  activeDmId?: string;
  onSelectSpace?: (id: string) => void;
  /** `spaceId` is passed when the channel lives outside the active space. */
  onSelectChannel?: (id: string, spaceId?: string) => void;
  onOpenHome?: () => void;
  onOpenDMs?: (conversationId?: string) => void;
  /** Real hrefs for nav items — enables middle-click / copy-link / new-tab. */
  hrefs?: {
    home: string;
    dms: string;
    space: (spaceId: string) => string;
    channel: (channelId: string) => string;
    dm: (conversationId: string) => string;
  };
}

/**
 * The three-column workspace (brief §App Shell). Self-contained and prop-driven:
 * NavRail · SpacePanel · MainArea, plus the on-demand Member/Thread/Search
 * panels. The main area switches on channel type — message, voice, board,
 * docs, github, canvas, incident.
 */
export function AppShell({
  data,
  control,
  demo,
}: {
  data: AppShellData;
  control?: AppShellControl;
  /** Sample mode — plays a short scripted sequence of incoming events. */
  demo?: boolean;
}) {
  // Selection is controlled when `control` provides it (routed shell), else local.
  const [localSpaceId, setLocalSpaceId] = useState(data.spaces[0]?.id ?? "");
  const activeSpaceId = control?.activeSpaceId ?? localSpaceId;

  const sections = useMemo(
    () => data.sectionsBySpace[activeSpaceId] ?? [],
    [data.sectionsBySpace, activeSpaceId]
  );
  const firstText = useMemo(
    () => sections.flatMap((s) => s.channels).find((c) => c.type === "text") ?? sections[0]?.channels[0],
    [sections]
  );

  const [localChannelId, setLocalChannelId] = useState(firstText?.id ?? "");
  const activeChannelId = control?.activeChannelId ?? localChannelId;

  // Home is the landing surface unless the URL already targets a channel.
  // When `control.view` is provided the URL drives these; locals are fallback.
  const [localHomeActive, setLocalHomeActive] = useState(!control?.activeChannelId);
  const [localDmsActive, setLocalDmsActive] = useState(false);
  const [localDmId, setLocalDmId] = useState(data.dmConversations?.[0]?.id ?? "");
  const homeActive = control?.view ? control.view === "home" : localHomeActive;
  const dmsActive = control?.view ? control.view === "dms" : localDmsActive;
  const activeDmId = control?.activeDmId ?? localDmId;
  const [showMembers, setShowMembers] = useState(false);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [recording, setRecording] = useState(false);
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [callHost, setCallHost] = useState<HTMLDivElement | null>(null);
  const [incoming, setIncoming] = useState<{ caller: CallPeer; video?: boolean } | null>(null);
  // Footer dock state — the self mute/deafen you carry into the next call.
  const [dockMuted, setDockMuted] = useState(false);
  const [dockDeafened, setDockDeafened] = useState(false);
  // Creation dialogs.
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [addChannelTarget, setAddChannelTarget] = useState<{
    spaceId: string;
    sectionId: string;
    sectionName: string;
  } | null>(null);
  const workspace = useWorkspaceStore();
  const authUser = useAuthStore((s) => s.user);
  const appStore = useAppStore();
  const chatStore = useChatStore();
  const isLive = !!authUser;
  const demoPlayed = useRef(false);
  const hydrated = useRef(false);
  // Locally-echoed messages (sends, clips) layered over the prop-driven feed.
  const [localEcho, setLocalEcho] = useState<Record<string, ChatMessage[]>>({});
  // Reaction toggles layered over base messages: msgId → emoji → state.
  const [reactionOv, setReactionOv] = useState<
    Record<string, Record<string, { delta: number; reacted: boolean }>>
  >({});
  // Pin toggles, text edits, and deletions layered the same way.
  const [pinOv, setPinOv] = useState<Record<string, boolean>>({});
  const [editOv, setEditOv] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const allChannels = useMemo(() => sections.flatMap((s) => s.channels), [sections]);
  const activeChannel = allChannels.find((c) => c.id === activeChannelId) ?? firstText;
  const space = data.spaces.find((s) => s.id === activeSpaceId);

  const refreshModules = async (spaceId: string) => {
    const modules = await fetchWorkspaceModules(spaceId);
    appStore.setWorkspaceModules(spaceId, modules);
  };

  const toApiChannelName = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "channel";

  // Ctrl/Cmd+F → search panel · Ctrl+Shift+R → clip recorder (brief §Search, §Clips)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setRecording(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Local chat layers survive reloads — hydrate once, then write through.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("corvus-local-chat-v1");
      if (raw) {
        const saved = JSON.parse(raw) as {
          echo?: Record<string, ChatMessage[]>;
          reactions?: typeof reactionOv;
          pins?: Record<string, boolean>;
          edits?: Record<string, string>;
          deleted?: string[];
        };
        if (saved.echo) setLocalEcho(saved.echo);
        if (saved.reactions) setReactionOv(saved.reactions);
        if (saved.pins) setPinOv(saved.pins);
        if (saved.edits) setEditOv(saved.edits);
        if (saved.deleted) setDeletedIds(new Set(saved.deleted));
      }
    } catch {
      /* corrupt cache — start clean */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      // blob: URLs die with the session — drop them so reloads degrade to
      // the named placeholder instead of a broken image.
      const echo = Object.fromEntries(
        Object.entries(localEcho).map(([k, msgs]) => [
          k,
          msgs.map((m) => ({
            ...m,
            attachments: m.attachments?.map((a) =>
              a.url?.startsWith("blob:") ? { ...a, url: undefined } : a
            ),
          })),
        ])
      );
      localStorage.setItem(
        "corvus-local-chat-v1",
        JSON.stringify({
          echo,
          reactions: reactionOv,
          pins: pinOv,
          edits: editOv,
          deleted: [...deletedIds],
        })
      );
    } catch {
      /* storage full — keep going in memory */
    }
  }, [localEcho, reactionOv, pinOv, editOv, deletedIds]);

  // Incoming call → looping ringtone until accepted or declined.
  useEffect(() => {
    if (!incoming) return;
    const ring = ringIncoming();
    return () => ring.stop();
  }, [incoming]);

  // Demo mode — a short scripted sequence so toasts, sounds, and the
  // incoming-call flow are visible without a realtime backend.
  useEffect(() => {
    if (!demo || demoPlayed.current) return;
    demoPlayed.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => {
        const text = "ringtones are in — try calling me";
        setLocalEcho((m) => ({
          ...m,
          d1: [
            ...(m.d1 ?? []),
            {
              id: `demo-msg-${Date.now()}`,
              author: { id: "u2", name: "alex", presence: "online" },
              at: new Date().toISOString(),
              text,
            },
          ],
        }));
        notifyEvent({ kind: "message", title: "alex", body: text, system: true });
      }, 9_000)
    );

    timers.push(
      setTimeout(() => {
        notifyEvent({
          kind: "mention",
          title: "maya mentioned you in #general",
          body: "@you can you sanity-check the new pin flow?",
          system: true,
        });
      }, 22_000)
    );

    timers.push(
      setTimeout(() => {
        setIncoming({ caller: { id: "u1", name: "maya" }, video: false });
        notifyEvent({ kind: "other", title: "Incoming call", body: "maya is calling you…" });
      }, 36_000)
    );

    return () => timers.forEach(clearTimeout);
  }, [demo]);

  const selectSpace = (id: string) => {
    const next = data.sectionsBySpace[id]?.flatMap((s) => s.channels).find((c) => c.type === "text");
    if (control?.onSelectSpace) {
      // One navigation, with the space made explicit so the channel push
      // doesn't resolve against the previous space.
      if (next && control.onSelectChannel) control.onSelectChannel(next.id, id);
      else control.onSelectSpace(id);
    } else {
      setLocalDmsActive(false);
      setLocalHomeActive(false);
      setLocalSpaceId(id);
      if (next) setLocalChannelId(next.id);
    }
  };

  const selectChannel = (id: string) => {
    setThreadParentId(null);
    setShowPins(false);
    if (control?.onSelectChannel) {
      control.onSelectChannel(id);
    } else {
      setLocalHomeActive(false);
      setLocalChannelId(id);
    }
  };

  // Open a channel that may live in another space (Home cards).
  const openChannelIn = (spaceId: string, channelId: string) => {
    setThreadParentId(null);
    setShowPins(false);
    if (control?.onSelectChannel) {
      control.onSelectChannel(channelId, spaceId);
    } else {
      setLocalDmsActive(false);
      setLocalHomeActive(false);
      setLocalSpaceId(spaceId);
      setLocalChannelId(channelId);
    }
  };

  const openHome = () => {
    if (control?.onOpenHome) {
      control.onOpenHome();
    } else {
      setLocalHomeActive(true);
      setLocalDmsActive(false);
    }
  };

  const openDMs = (conversationId?: string) => {
    if (control?.onOpenDMs) {
      control.onOpenDMs(conversationId);
      return;
    }
    setLocalHomeActive(false);
    setLocalDmsActive(true);
    if (conversationId) setLocalDmId(conversationId);
  };

  // Merge base messages with every local layer: echoes, reactions, pins,
  // edits, deletions. One pipeline for channels, DMs, and group DMs.
  const messagesFor = (id: string): ChatMessage[] =>
    [...(data.messagesByChannel[id] ?? []), ...(localEcho[id] ?? [])]
      .filter((m) => !deletedIds.has(m.id))
      .map((m) => {
        let out = m;
        if (editOv[m.id] !== undefined) out = { ...out, text: editOv[m.id], edited: true };
        if (pinOv[m.id] !== undefined) out = { ...out, pinned: pinOv[m.id] };
        const ov = reactionOv[m.id];
        if (!ov) return out;
        const base = out.reactions ?? [];
        const merged = base
          .map((r) => {
            const o = ov[r.emoji];
            if (!o) return r;
            return { ...r, count: r.count + o.delta, reacted: o.reacted };
          })
          .filter((r) => r.count > 0);
        for (const [emoji, o] of Object.entries(ov)) {
          if (!base.some((r) => r.emoji === emoji) && o.delta > 0) {
            merged.push({ emoji, count: o.delta, reacted: o.reacted });
          }
        }
        return { ...out, reactions: merged.length ? merged : undefined };
      });

  const togglePin = (targetId: string) => (msgId: string) => {
    const msg = messagesFor(targetId).find((m) => m.id === msgId);
    const next = !(msg?.pinned ?? false);
    const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);
    if (isLive && !isDmTarget) {
      const request = next ? pinChannelMessage(targetId, msgId) : unpinChannelMessage(targetId, msgId);
      request.catch((err) => {
        useToastStore.getState().addToast({
          title: "Pin failed",
          body: err instanceof Error ? err.message : "Could not update the pin in Supabase.",
          variant: "error",
        });
      });
    }
    setPinOv((ov) => ({ ...ov, [msgId]: next }));
    useToastStore.getState().addToast({
      title: next ? "Message pinned" : "Message unpinned",
      body: msg?.text ? msg.text.slice(0, 80) : "Open the pin panel from the header.",
      variant: "success",
    });
  };

  const editMessage = (msgId: string, text: string) =>
    setEditOv((ov) => ({ ...ov, [msgId]: text }));

  const deleteMessage = (msgId: string) =>
    setDeletedIds((ids) => new Set(ids).add(msgId));

  const toggleReaction = (targetId: string) => (msgId: string, emoji: string) => {
    const msg = messagesFor(targetId).find((m) => m.id === msgId);
    const current = msg?.reactions?.find((r) => r.emoji === emoji);
    const reactedNow = current?.reacted ?? false;
    const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);
    if (isLive && !isDmTarget && authUser) {
      const request = reactedNow
        ? removeChannelReactionApi(msgId, emoji)
        : addChannelReactionApi(msgId, emoji);
      request
        .then(() => {
          if (reactedNow) chatStore.removeReaction(targetId, msgId, emoji, authUser.id, authUser.id);
          else chatStore.addReaction(targetId, msgId, emoji, authUser.id, authUser.id);
        })
        .catch(() => {});
      return;
    }
    setReactionOv((ov) => {
      const forMsg = { ...(ov[msgId] ?? {}) };
      const existing = forMsg[emoji] ?? { delta: 0, reacted: false };
      forMsg[emoji] = reactedNow
        ? { delta: existing.delta - 1, reacted: false }
        : { delta: existing.delta + 1, reacted: true };
      return { ...ov, [msgId]: forMsg };
    });
  };

  const sendMessage = (targetId: string) => (
    text: string,
    attachments?: ChatMessage["attachments"],
    replyTo?: ChatMessage["replyTo"]
  ) => {
    const isDmTarget = data.dmConversations?.some((c) => c.id === targetId);
    if (isLive && !isDmTarget) {
      sendChannelMessageApi(targetId, { content: text, replyToId: replyTo?.id })
        .then((r) => chatStore.addMessage(targetId, r.message))
        .catch((err) => {
          useToastStore.getState().addToast({
            title: "Message failed",
            body: err instanceof Error ? err.message : "Could not save the message in Supabase.",
            variant: "error",
          });
        });
      return;
    }
    if (isLive && isDmTarget) {
      sendDMMessage(targetId, text, replyTo?.id).catch(() => {});
    }
    const msg: ChatMessage = {
      id: `local${Date.now()}`,
      author: data.me,
      at: new Date().toISOString(),
      text,
      attachments,
      replyTo,
    };
    setLocalEcho((m) => ({ ...m, [targetId]: [...(m[targetId] ?? []), msg] }));
  };

  const channelMessages = activeChannel ? messagesFor(activeChannel.id) : [];
  const dmConversation = data.dmConversations?.find((c) => c.id === activeDmId);
  const dmMessages = activeDmId ? messagesFor(activeDmId) : [];
  const threadParent = channelMessages.find((m) => m.id === threadParentId) ?? null;

  // Stop recording → a clip message lands in the current channel.
  const finishClip = (duration: string) => {
    setRecording(false);
    const targetId = dmsActive ? activeDmId : activeChannel?.id;
    if (!targetId) return;
    const msg: ChatMessage = {
      id: `clip${Date.now()}`,
      author: data.me,
      at: new Date().toISOString(),
      text: "",
      clip: { duration, size: "4.2 MB" },
    };
    setLocalEcho((m) => ({ ...m, [targetId]: [...(m[targetId] ?? []), msg] }));
    useToastStore.getState().addToast({
      title: "Clip posted",
      body: `${duration} clip shared in the current conversation.`,
      variant: "success",
    });
  };

  // Everything searchable in the active space (brief §Search).
  const searchCorpus: SearchCorpus = useMemo(() => {
    const messages = allChannels.flatMap((ch) =>
      (data.messagesByChannel[ch.id] ?? []).map((m) => ({ ...m, channel: ch.name }))
    );
    const cards = allChannels.flatMap((ch) => {
      const board = data.boardsByChannel?.[ch.id];
      return board
        ? board.columns.flatMap((col) => col.cards.map((c) => ({ ...c, column: col.title })))
        : [];
    });
    const docs = allChannels.flatMap((ch) =>
      (data.docsByChannel?.[ch.id] ?? []).map((d) => ({
        ...d,
        preview: d.blocks.find((b) => b.type === "p")?.text,
      }))
    );
    const prs = allChannels.flatMap((ch) => data.prsByChannel?.[ch.id] ?? []);
    return { messages, cards, docs, prs };
  }, [allChannels, data]);

  // Start an outgoing DM call — group DMs ring every member (the demo seam
  // for the realtime call stack).
  const startCall = (video?: boolean) => {
    if (!dmConversation) return;
    const peers: CallPeer[] = dmConversation.group?.length
      ? dmConversation.group.map((g) => ({ id: g.id, name: g.name, avatar: g.avatar }))
      : [{ id: dmConversation.id, name: dmConversation.name, avatar: dmConversation.avatar }];
    setCall({ conversationId: dmConversation.id, peers, video, name: dmConversation.name });
  };

  // Log a call entry into a conversation's feed (history for 1:1 and groups).
  const logCall = (
    conversationId: string,
    author: MemberRef,
    entry: NonNullable<ChatMessage["call"]>
  ) => {
    const msg: ChatMessage = {
      id: `call${Date.now()}`,
      author,
      at: new Date().toISOString(),
      text: "",
      call: entry,
    };
    setLocalEcho((m) => ({ ...m, [conversationId]: [...(m[conversationId] ?? []), msg] }));
  };

  const endCall = (elapsedSeconds: number) => {
    if (call) {
      logCall(call.conversationId, data.me, {
        kind: call.video ? "video" : "voice",
        duration: elapsedSeconds > 0 ? fmtCallDuration(elapsedSeconds) : undefined,
      });
    }
    setCall(null);
  };

  // Map an incoming caller to their DM conversation.
  const convoForCaller = (caller: CallPeer) =>
    data.dmConversations?.find(
      (c) =>
        c.id === caller.id ||
        (!c.group && c.name === caller.name) ||
        c.group?.some((g) => g.id === caller.id)
    );

  // Presence + custom status — applied across the app instantly; in live mode
  // the auth store pushes it to the backend so every user sees it.
  const setMyStatus = (presence: Presence, text?: string) => {
    workspace.setMyStatus({ presence, text });
    const auth = useAuthStore.getState();
    if (auth.user) auth.setStatus(presence === "offline" ? "invisible" : presence);
  };

  /* ── Friends — instant, optimistic request flow ── */
  const refreshFriends = () => {
    if (!isLive) return;
    fetchFriendDashboard()
      .then((r) => appStore.setFriends(r))
      .catch(() => {});
  };

  const sendFriendRequest = (username: string) => {
    const existing = data.friends?.find((f) => f.name.toLowerCase() === username.toLowerCase());
    if (existing) {
      useToastStore.getState().addToast({
        title: existing.pending ? "Request already pending" : "Already friends",
        body: `@${existing.name} is already in your list.`,
        variant: "info",
      });
      return;
    }

    if (isLive) {
      sendFriendRequestApi(username)
        .then(() => {
          useToastStore.getState().addToast({
            title: "Request sent",
            body: `@${username} will see it instantly under Pending.`,
            variant: "success",
          });
          refreshFriends();
        })
        .catch((err) => {
          useToastStore.getState().addToast({
            title: "Failed to send request",
            body: err instanceof Error ? err.message : "Could not send friend request.",
            variant: "error",
          });
        });
      return;
    }

    const id = `fr${Date.now()}`;
    workspace.sendFriendRequest({ id, name: username, presence: "offline", pending: "outgoing" });
    useToastStore.getState().addToast({
      title: "Request sent",
      body: `@${username} will see it instantly under Pending.`,
      variant: "success",
    });
    // Demo seam — the realtime backend would push the acceptance.
    if (demo) {
      setTimeout(() => {
        useWorkspaceStore.getState().acceptFriend(id);
        notifyEvent({
          kind: "other",
          title: "Friend request accepted",
          body: `${username} accepted your request.`,
        });
      }, 4000);
    }
  };

  const acceptFriend = (id: string) => {
    const f = data.friends?.find((x) => x.id === id);
    if (isLive) {
      acceptFriendRequestApi(id)
        .then(() => {
          useToastStore.getState().addToast({
            title: "Friend added",
            body: f ? `You and ${f.name} are now friends.` : "You're now friends.",
            variant: "success",
          });
          refreshFriends();
        })
        .catch((err) => {
          useToastStore.getState().addToast({
            title: "Failed to accept friend request",
            body: err instanceof Error ? err.message : "Could not accept friend request.",
            variant: "error",
          });
        });
      return;
    }

    workspace.acceptFriend(id);
    useToastStore.getState().addToast({
      title: "Friend added",
      body: f ? `You and ${f.name} are now friends.` : "You're now friends.",
      variant: "success",
    });
  };

  const declineOrRemoveFriend = (id: string) => {
    if (!isLive) {
      workspace.removeFriend(id);
      return;
    }
    const f = data.friends?.find((x) => x.id === id);
    if (!f) return;

    if (f.pending === "incoming") {
      declineFriendRequestApi(id)
        .then(() => {
          useToastStore.getState().addToast({
            title: "Request declined",
            body: `Declined request from @${f.name}.`,
            variant: "info",
          });
          refreshFriends();
        })
        .catch((err) => {
          useToastStore.getState().addToast({
            title: "Failed to decline request",
            body: err instanceof Error ? err.message : "Could not decline request.",
            variant: "error",
          });
        });
    } else if (f.pending === "outgoing") {
      cancelFriendRequestApi(id)
        .then(() => {
          useToastStore.getState().addToast({
            title: "Request canceled",
            body: `Canceled request to @${f.name}.`,
            variant: "info",
          });
          refreshFriends();
        })
        .catch((err) => {
          useToastStore.getState().addToast({
            title: "Failed to cancel request",
            body: err instanceof Error ? err.message : "Could not cancel request.",
            variant: "error",
          });
        });
    } else {
      removeFriendApi(id)
        .then(() => {
          useToastStore.getState().addToast({
            title: "Friend removed",
            body: `@${f.name} removed from friends.`,
            variant: "info",
          });
          refreshFriends();
        })
        .catch((err) => {
          useToastStore.getState().addToast({
            title: "Failed to remove friend",
            body: err instanceof Error ? err.message : "Could not remove friend.",
            variant: "error",
          });
        });
    }
  };

  /* ── Creation flows — spaces, sections, channels, conversations ── */
  const createSpace = (name: string, template: SpaceTemplate) => {
    const spaceId = `sp${Date.now()}`;
    const boards: BoardData[] = [];
    const incidents: Record<string, IncidentMeta> = {};
    const sections: ChannelSection[] = template.blueprint.map((b, si) => ({
      id: `${spaceId}-sec${si}`,
      name: b.section,
      channels: b.channels.map((c, ci) => {
        const id = `${spaceId}-c${si}-${ci}`;
        if (c.type === "board") boards.push(emptyBoard(id, c.name));
        if (c.type === "incident") incidents[id] = newIncident();
        return { id, name: c.name, type: c.type };
      }),
    }));
    if (isLive) {
      createServer({
        name,
        channels: template.blueprint.flatMap((section) =>
          section.channels.map((channel) => ({
            name: toApiChannelName(channel.name),
            type: channel.type,
            category: section.section,
          }))
        ),
      })
        .then(async ({ server }) => {
          appStore.addServer(server);
          appStore.setChannels(server.channels);
          await refreshModules(server.id);
          setShowCreateSpace(false);
          const firstChannel = server.channels.find((c) => c.type === "text") ?? server.channels[0];
          if (firstChannel) openChannelIn(server.id, firstChannel.id);
          useToastStore.getState().addToast({
            title: "Space created",
            body: `${name} is synced with Supabase.`,
            variant: "success",
          });
        })
        .catch((err) => {
          useToastStore.getState().addToast({
            title: "Space failed",
            body: err instanceof Error ? err.message : "Could not create the space.",
            variant: "error",
          });
        });
      return;
    }
    workspace.createSpace({ id: spaceId, name }, sections, { boards, incidents });
    setShowCreateSpace(false);
    const firstChannel = sections.flatMap((s) => s.channels).find((c) => c.type === "text");
    if (firstChannel) openChannelIn(spaceId, firstChannel.id);
    useToastStore.getState().addToast({
      title: "Space created",
      body: `${name} is ready — add channels and sections any time.`,
      variant: "success",
    });
  };

  const openAddChannel = (sectionId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    setAddChannelTarget({
      spaceId: activeSpaceId,
      sectionId,
      sectionName: sec?.name ?? "this section",
    });
  };

  const addChannel = (name: string, type: ChannelType) => {
    if (!addChannelTarget) return;
    if (isLive) {
      createChannelApi(addChannelTarget.spaceId, {
        name: toApiChannelName(name),
        type,
        category: addChannelTarget.sectionName,
      })
        .then(async ({ channel }) => {
          appStore.addChannel(channel);
          await refreshModules(addChannelTarget.spaceId);
          setAddChannelTarget(null);
          selectChannel(channel.id);
        })
        .catch((err) => {
          useToastStore.getState().addToast({
            title: "Channel failed",
            body: err instanceof Error ? err.message : "Could not create the channel.",
            variant: "error",
          });
        });
      return;
    }
    const id = `ch${Date.now()}`;
    workspace.addChannel(
      addChannelTarget.spaceId,
      addChannelTarget.sectionId,
      { id, name, type },
      {
        board: type === "board" ? emptyBoard(id, name) : undefined,
        incident: type === "incident" ? newIncident() : undefined,
      }
    );
    setAddChannelTarget(null);
    selectChannel(id);
  };

  const addSection = (name: string) => {
    workspace.addSection(activeSpaceId, { id: `sec${Date.now()}`, name, channels: [] });
    setShowAddSection(false);
  };

  const createConversation = (members: FriendEntry[], name?: string) => {
    setShowNewGroup(false);
    if (members.length === 1) {
      const f = members[0];
      const existing = data.dmConversations?.find(
        (c) => !c.group && (c.id === f.id || c.name === f.name)
      );
      if (existing) {
        openDMs(existing.id);
        return;
      }
      const convo: DMSummary = { id: `dm${Date.now()}`, name: f.name, avatar: f.avatar, presence: f.presence };
      workspace.createConversation(convo);
      openDMs(convo.id);
      return;
    }
    const convo: DMSummary = {
      id: `gdm${Date.now()}`,
      name: name || members.map((m) => m.name).join(", "),
      group: members.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar })),
    };
    workspace.createConversation(convo);
    openDMs(convo.id);
  };

  const updateBoardState = (channelId: string, board: BoardData) => {
    if (!isLive) {
      workspace.updateBoard(channelId, board);
      return;
    }
    appStore.upsertBoardState(channelId, board);
    saveBoardState(channelId, board).catch(() => {});
  };

  const updateDocsState = (channelId: string, docs: DocContent[]) => {
    if (!isLive) {
      workspace.updateDocs(channelId, docs);
      return;
    }
    appStore.upsertDocsState(channelId, docs);
    saveDocsState(channelId, docs).catch(() => {});
  };

  const updateIncidentState = (channelId: string, incident: IncidentMeta) => {
    if (!isLive) {
      workspace.updateIncident(channelId, incident);
      return;
    }
    appStore.upsertIncidentState(channelId, incident);
    saveIncidentState(channelId, incident).catch(() => {});
  };

  const connectGitHubState = (channelId: string, prs: PullRequest[]) => {
    if (!isLive) {
      workspace.connectGitHub(channelId, prs);
      return;
    }
    appStore.upsertGitHubState(channelId, prs);
    saveGitHubState(channelId, { pullRequests: prs }).catch(() => {});
  };

  const renderMain = () => {
    if (homeActive) {
      return (
        <HomeView
          data={data}
          onOpenChannel={openChannelIn}
          onOpenDM={(friendId) => {
            const convo = data.dmConversations?.find((c) => c.id === friendId || c.name === friendId);
            openDMs(convo?.id);
          }}
          onSendFriendRequest={sendFriendRequest}
          onAcceptFriend={acceptFriend}
          onDeclineFriend={declineOrRemoveFriend}
        />
      );
    }
    if (dmsActive) {
      return (
        dmConversation && (
          <div className="flex h-full min-w-0 flex-1 flex-col">
            {/* Inline call mount — the active call renders here, above the
                messages, when it belongs to this conversation. */}
            {call?.conversationId === dmConversation.id && (
              <div ref={setCallHost} className="shrink-0" />
            )}
            <MessageArea
              channelName={dmConversation.name}
              channelType="text"
              messages={dmMessages}
              members={dmConversation.group?.map((g) => ({ id: g.id, name: g.name, avatar: g.avatar }))}
              dm={{
                onVoiceCall: () => startCall(false),
                onVideoCall: () => startCall(true),
              }}
              onOpenThread={setThreadParentId}
              onOpenSearch={() => setShowSearch(true)}
              onOpenPins={() => setShowPins((v) => !v)}
              onRecordClip={() => setRecording(true)}
              onSend={sendMessage(dmConversation.id)}
              onReact={toggleReaction(dmConversation.id)}
              meId={data.me.id}
              onPin={togglePin(dmConversation.id)}
              onEdit={editMessage}
              onDelete={deleteMessage}
            />
          </div>
        )
      );
    }
    if (!activeChannel) return null;

    switch (activeChannel.type) {
      case "voice":
        return (
          <VoiceView
            channelName={activeChannel.name}
            participants={
              data.voiceByChannel?.[activeChannel.id] ??
              (activeChannel.participants ?? []).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }))
            }
          />
        );
      case "stage":
        return (
          <StageView
            channelName={activeChannel.name}
            participants={data.voiceByChannel?.[activeChannel.id] ?? []}
          />
        );
      case "board": {
        const board = data.boardsByChannel?.[activeChannel.id];
        const channelId = activeChannel.id;
        return board ? (
          <BoardView
            key={channelId}
            board={board}
            onChange={(b) => updateBoardState(channelId, b)}
          />
        ) : null;
      }
      case "docs": {
        const channelId = activeChannel.id;
        return (
          <DocsView
            key={channelId}
            docs={data.docsByChannel?.[channelId] ?? []}
            me={data.me}
            onChangeDocs={(docs) => updateDocsState(channelId, docs)}
          />
        );
      }
      case "github": {
        const channelId = activeChannel.id;
        return (
          <GitHubView
            prs={data.prsByChannel?.[channelId] ?? []}
            onConnect={() => {
              connectGitHubState(channelId, seedPRs());
              useToastStore.getState().addToast({
                title: "GitHub connected",
                body: "corvus/web and corvus/gateway now route PRs to this channel.",
                variant: "success",
              });
            }}
          />
        );
      }
      case "canvas":
        return <CanvasView channelName={activeChannel.name} storageKey={activeChannel.id} />;
      case "incident": {
        const incident = data.incidentsByChannel?.[activeChannel.id];
        const channelId = activeChannel.id;
        return incident ? (
          <IncidentView
            channelName={activeChannel.name}
            incident={incident}
            messages={channelMessages}
            me={data.me}
            onUpdate={(meta) => updateIncidentState(channelId, meta)}
            onSend={sendMessage(channelId)}
          />
        ) : null;
      }
      default:
        return (
          <MessageArea
            channelName={activeChannel.name}
            channelType={activeChannel.type}
            topic={activeChannel.type === "text" ? "Keep it constructive." : undefined}
            messages={channelMessages}
            members={data.membersBySpace[activeSpaceId]}
            onToggleMembers={() => setShowMembers((v) => !v)}
            onOpenThread={setThreadParentId}
            onOpenSearch={() => setShowSearch(true)}
            onOpenPins={() => setShowPins((v) => !v)}
            onRecordClip={() => setRecording(true)}
            onSend={sendMessage(activeChannel.id)}
            onReact={toggleReaction(activeChannel.id)}
            meId={data.me.id}
            onPin={togglePin(activeChannel.id)}
            onEdit={editMessage}
            onDelete={deleteMessage}
          />
        );
    }
  };

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden">
      <NavRail
        spaces={data.spaces}
        activeSpaceId={activeSpaceId}
        homeActive={homeActive}
        dmsActive={dmsActive}
        onOpenHome={openHome}
        onSelectSpace={selectSpace}
        onOpenDMs={() => openDMs()}
        onAddSpace={() => setShowCreateSpace(true)}
        onOpenSettings={() => setShowSettings(true)}
        homeHref={control?.hrefs?.home}
        dmsHref={control?.hrefs?.dms}
        spaceHref={control?.hrefs?.space}
      />

      {/* Home is a full-bleed surface — no second sidebar. */}
      {!homeActive &&
        (dmsActive ? (
          <DMPanel
            conversations={data.dmConversations ?? []}
            activeId={activeDmId}
            onSelect={openDMs}
            onNewConversation={() => setShowNewGroup(true)}
            conversationHref={control?.hrefs?.dm}
            me={data.me}
            muted={dockMuted}
            deafened={dockDeafened}
            onToggleMute={() => setDockMuted((v) => !v)}
            onToggleDeafen={() => {
              if (!dockDeafened) setDockMuted(true);
              setDockDeafened((v) => !v);
            }}
            onOpenSettings={() => setShowSettings(true)}
            onSetStatus={setMyStatus}
          />
        ) : (
          <SpacePanel
            spaceName={space?.name ?? "Space"}
            sections={sections}
            activeChannelId={activeChannel?.id}
            me={data.me}
            onSelectChannel={selectChannel}
            onOpenSpaceSettings={() => setShowSettings(true)}
            onAddChannel={openAddChannel}
            onAddSection={() => setShowAddSection(true)}
            channelHref={control?.hrefs?.channel}
            muted={dockMuted}
            deafened={dockDeafened}
            onToggleMute={() => setDockMuted((v) => !v)}
            onToggleDeafen={() => {
              // Deafening implies muting — undeafening leaves mute as-is.
              if (!dockDeafened) setDockMuted(true);
              setDockDeafened((v) => !v);
            }}
            onSetStatus={setMyStatus}
          />
        ))}

      {renderMain()}

      {threadParent && !showSearch && !showPins && (
        <ThreadPanel parent={threadParent} replies={[]} onClose={() => setThreadParentId(null)} />
      )}

      {showSearch && <SearchPanel corpus={searchCorpus} onClose={() => setShowSearch(false)} />}

      {showPins && !showSearch && !homeActive && (
        <PinnedPanel
          messages={dmsActive ? dmMessages : channelMessages}
          onClose={() => setShowPins(false)}
        />
      )}

      {showMembers && !dmsActive && !showSearch && !showPins && !homeActive && (
        <MemberPanel
          members={data.membersBySpace[activeSpaceId] ?? []}
          onClose={() => setShowMembers(false)}
        />
      )}

      {recording && <ClipRecorder onStop={finishClip} onCancel={() => setRecording(false)} />}

      {call && (
        <CallSession
          key={call.conversationId}
          call={call}
          me={{ id: data.me.id, name: data.me.name, avatar: data.me.avatar }}
          inlineHost={callHost}
          initialMuted={dockMuted}
          initialDeafened={dockDeafened}
          onJump={() => openDMs(call.conversationId)}
          onEnd={endCall}
        />
      )}

      {incoming && !call && (
        <IncomingCallCard
          caller={incoming.caller}
          video={incoming.video}
          onAccept={() => {
            const { caller, video } = incoming;
            // Land in the caller's DM conversation so the call mounts inline.
            const convo = convoForCaller(caller);
            setCall({ conversationId: convo?.id ?? caller.id, peers: [caller], video, name: caller.name });
            if (convo) openDMs(convo.id);
            setIncoming(null);
          }}
          onDecline={() => {
            const { caller, video } = incoming;
            const convo = convoForCaller(caller);
            if (convo) {
              logCall(convo.id, { id: caller.id, name: caller.name, avatar: caller.avatar }, {
                kind: video ? "video" : "voice",
                missed: true,
              });
            }
            setIncoming(null);
          }}
        />
      )}

      {showSettings && (
        <SettingsView
          spaceName={space?.name}
          sections={sections}
          members={data.membersBySpace[activeSpaceId]}
          onClose={() => setShowSettings(false)}
          onRenameSpace={(name) => {
            if (!isLive) {
              workspace.renameSpace(activeSpaceId, name);
              return;
            }
            updateServerApi(activeSpaceId, { name })
              .then(({ server }) => appStore.updateServer(activeSpaceId, server))
              .catch((err) => {
                useToastStore.getState().addToast({
                  title: "Rename failed",
                  body: err instanceof Error ? err.message : "Could not rename this space.",
                  variant: "error",
                });
              });
          }}
          onDeleteSpace={() => {
            if (isLive) {
              deleteServerApi(activeSpaceId)
                .then(() => appStore.removeServer(activeSpaceId))
                .catch((err) => {
                  useToastStore.getState().addToast({
                    title: "Delete failed",
                    body: err instanceof Error ? err.message : "Could not delete this space.",
                    variant: "error",
                  });
                });
            } else {
              workspace.deleteSpace(activeSpaceId);
            }
            setShowSettings(false);
            openHome();
          }}
          onDeleteChannel={(id) => {
            if (isLive) {
              deleteChannelApi(id)
                .then(() => appStore.removeChannel(id))
                .catch((err) => {
                  useToastStore.getState().addToast({
                    title: "Delete failed",
                    body: err instanceof Error ? err.message : "Could not delete this channel.",
                    variant: "error",
                  });
                });
              return;
            }
            workspace.removeChannel(id);
          }}
          onAddChannel={(sectionId) => {
            setShowSettings(false);
            openAddChannel(sectionId);
          }}
          onRemoveMember={(id) => workspace.removeMember(activeSpaceId, id)}
        />
      )}

      {showCreateSpace && (
        <CreateSpaceDialog onCreate={createSpace} onClose={() => setShowCreateSpace(false)} />
      )}
      {addChannelTarget && (
        <AddChannelDialog
          sectionName={addChannelTarget.sectionName}
          onCreate={addChannel}
          onClose={() => setAddChannelTarget(null)}
        />
      )}
      {showAddSection && (
        <AddSectionDialog onCreate={addSection} onClose={() => setShowAddSection(false)} />
      )}
      {showNewGroup && (
        <NewGroupDialog
          friends={data.friends ?? []}
          onCreate={createConversation}
          onClose={() => setShowNewGroup(false)}
        />
      )}

      <ToastViewport />
    </div>
  );
}
