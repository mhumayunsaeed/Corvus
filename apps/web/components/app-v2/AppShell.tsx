"use client";

import { useMemo, useState } from "react";
import { NavRail } from "./NavRail";
import { SpacePanel } from "./SpacePanel";
import { DMPanel } from "./DMPanel";
import { MessageArea } from "./MessageArea";
import { MemberPanel } from "./MemberPanel";
import { ThreadPanel } from "./ThreadPanel";
import { VoiceView } from "./VoiceView";
import { SettingsView } from "./SettingsView";
import type {
  ChannelSection,
  ChatMessage,
  DMSummary,
  MemberRef,
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
}

export interface AppShellControl {
  activeSpaceId?: string;
  activeChannelId?: string;
  onSelectSpace?: (id: string) => void;
  onSelectChannel?: (id: string) => void;
}

/**
 * The three-column workspace (brief §App Shell). Self-contained and prop-driven:
 * NavRail · SpacePanel · MessageArea, plus the on-demand MemberPanel. Selection
 * is local state here — a clean seam for wiring to live stores/routing later.
 */
export function AppShell({ data, control }: { data: AppShellData; control?: AppShellControl }) {
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

  const [dmsActive, setDmsActive] = useState(false);
  const [activeDmId, setActiveDmId] = useState(data.dmConversations?.[0]?.id ?? "");
  const [showMembers, setShowMembers] = useState(false);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const allChannels = useMemo(() => sections.flatMap((s) => s.channels), [sections]);
  const activeChannel = allChannels.find((c) => c.id === activeChannelId) ?? firstText;
  const space = data.spaces.find((s) => s.id === activeSpaceId);

  const selectSpace = (id: string) => {
    setDmsActive(false);
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
    if (control?.onSelectChannel) control.onSelectChannel(id);
    else setLocalChannelId(id);
  };

  const channelMessages = activeChannel ? data.messagesByChannel[activeChannel.id] ?? [] : [];
  const dmConversation = data.dmConversations?.find((c) => c.id === activeDmId);
  const dmMessages = activeDmId ? data.messagesByChannel[activeDmId] ?? [] : [];
  const threadParent = channelMessages.find((m) => m.id === threadParentId) ?? null;

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden">
      <NavRail
        spaces={data.spaces}
        activeSpaceId={activeSpaceId}
        dmsActive={dmsActive}
        onSelectSpace={selectSpace}
        onOpenDMs={() => setDmsActive(true)}
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

      {dmsActive ? (
        dmConversation && (
          <MessageArea
            channelName={dmConversation.name}
            channelType="text"
            messages={dmMessages}
            onToggleMembers={() => setShowMembers((v) => !v)}
            onOpenThread={setThreadParentId}
          />
        )
      ) : activeChannel?.type === "voice" ? (
        <VoiceView
          channelName={activeChannel.name}
          participants={
            data.voiceByChannel?.[activeChannel.id] ??
            (activeChannel.participants ?? []).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }))
          }
        />
      ) : (
        activeChannel && (
          <MessageArea
            channelName={activeChannel.name}
            channelType={activeChannel.type}
            topic={activeChannel.type === "text" ? "Keep it constructive." : undefined}
            messages={channelMessages}
            onToggleMembers={() => setShowMembers((v) => !v)}
            onOpenThread={setThreadParentId}
          />
        )
      )}

      {threadParent && (
        <ThreadPanel parent={threadParent} replies={[]} onClose={() => setThreadParentId(null)} />
      )}

      {showMembers && !dmsActive && (
        <MemberPanel
          members={data.membersBySpace[activeSpaceId] ?? []}
          onClose={() => setShowMembers(false)}
        />
      )}

      {showSettings && <SettingsView onClose={() => setShowSettings(false)} />}
    </div>
  );
}
