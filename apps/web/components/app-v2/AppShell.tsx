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
import { CallModal, IncomingCallCard, type CallPeer } from "./CallUI";
import { ToastViewport } from "@/components/ui/Toast";
import { useToastStore } from "@/stores/toast-store";
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
  PullRequest,
  SpaceSummary,
  VoiceParticipant,
} from "./types";

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
  onSelectSpace?: (id: string) => void;
  onSelectChannel?: (id: string) => void;
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
  const [homeActive, setHomeActive] = useState(!control?.activeChannelId);
  const [dmsActive, setDmsActive] = useState(false);
  const [activeDmId, setActiveDmId] = useState(data.dmConversations?.[0]?.id ?? "");
  const [showMembers, setShowMembers] = useState(false);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [recording, setRecording] = useState(false);
  const [call, setCall] = useState<{ peers: CallPeer[]; video?: boolean; name?: string } | null>(null);
  const [callMinimized, setCallMinimized] = useState(false);
  const [incoming, setIncoming] = useState<{ caller: CallPeer; video?: boolean } | null>(null);
  const demoPlayed = useRef(false);
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
    setDmsActive(false);
    setHomeActive(false);
    const next = data.sectionsBySpace[id]?.flatMap((s) => s.channels).find((c) => c.type === "text");
    if (control?.onSelectSpace) {
      control.onSelectSpace(id);
      if (next) control.onSelectChannel?.(next.id);
    } else {
      setLocalSpaceId(id);
      if (next) setLocalChannelId(next.id);
    }
  };

  const selectChannel = (id: string) => {
    setThreadParentId(null);
    setShowPins(false);
    setHomeActive(false);
    if (control?.onSelectChannel) control.onSelectChannel(id);
    else setLocalChannelId(id);
  };

  const openDMs = (conversationId?: string) => {
    setHomeActive(false);
    setDmsActive(true);
    if (conversationId) setActiveDmId(conversationId);
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
    setCall({ peers, video, name: dmConversation.name });
  };

  const renderMain = () => {
    if (homeActive) {
      return (
        <HomeView
          data={data}
          onOpenChannel={(spaceId, channelId) => {
            selectSpace(spaceId);
            selectChannel(channelId);
          }}
          onOpenDM={(friendId) => {
            const convo = data.dmConversations?.find((c) => c.id === friendId || c.name === friendId);
            openDMs(convo?.id);
          }}
        />
      );
    }
    if (dmsActive) {
      return (
        dmConversation && (
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
        return board ? <BoardView board={board} /> : null;
      }
      case "docs":
        return <DocsView docs={data.docsByChannel?.[activeChannel.id] ?? []} />;
      case "github":
        return <GitHubView prs={data.prsByChannel?.[activeChannel.id] ?? []} />;
      case "canvas":
        return <CanvasView channelName={activeChannel.name} />;
      case "incident": {
        const incident = data.incidentsByChannel?.[activeChannel.id];
        return incident ? (
          <IncidentView
            channelName={activeChannel.name}
            incident={incident}
            messages={channelMessages}
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
        onOpenHome={() => {
          setHomeActive(true);
          setDmsActive(false);
        }}
        onSelectSpace={selectSpace}
        onOpenDMs={() => openDMs()}
        onOpenSettings={() => setShowSettings(true)}
      />

      {dmsActive ? (
        <DMPanel
          conversations={data.dmConversations ?? []}
          activeId={activeDmId}
          onSelect={setActiveDmId}
        />
      ) : (
        <SpacePanel
          spaceName={space?.name ?? "Space"}
          sections={sections}
          activeChannelId={activeChannel?.id}
          me={data.me}
          onSelectChannel={selectChannel}
          onOpenSpaceSettings={() => setShowSettings(true)}
        />
      )}

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
        <CallModal
          peers={call.peers}
          me={{ id: data.me.id, name: data.me.name, avatar: data.me.avatar }}
          name={call.name}
          video={call.video}
          minimized={callMinimized}
          onMinimize={() => setCallMinimized(true)}
          onRestore={() => setCallMinimized(false)}
          onClose={() => {
            setCall(null);
            setCallMinimized(false);
          }}
        />
      )}

      {incoming && !call && (
        <IncomingCallCard
          caller={incoming.caller}
          video={incoming.video}
          onAccept={() => {
            setCall({ peers: [incoming.caller], video: incoming.video, name: incoming.caller.name });
            setIncoming(null);
          }}
          onDecline={() => setIncoming(null)}
        />
      )}

      {showSettings && (
        <SettingsView
          spaceName={space?.name}
          members={data.membersBySpace[activeSpaceId]}
          onClose={() => setShowSettings(false)}
        />
      )}

      <ToastViewport />
    </div>
  );
}
