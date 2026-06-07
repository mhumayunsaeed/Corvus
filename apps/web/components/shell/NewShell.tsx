"use client";

import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Hash } from "lucide-react";
import {
    ChatView,
    DMChatView,
    CallModal,
    FriendsView,
} from "@/components/app";
import { VoiceChannelView } from "@/components/app/VoiceChannelView";
import { StageChannelView } from "@/components/app/StageChannelView";
import { VoiceControlBar } from "@/components/app/VoiceControlBar";
import { useAppStore } from "@/stores/app-store";
import { useVoiceStore } from "@/stores/voice-store";
import { Sidebar } from "./Sidebar";
import { HomeHub } from "./HomeHub";
import { ContextPanel } from "./ContextPanel";
import type { FriendListEntry, DMConversationData } from "@/lib/api";

export interface ActiveDMCall {
    conversationId: string;
    token: string;
    url: string;
    initialVideo: boolean;
}

export interface NewShellProps {
    onCreateServer: () => void;
    onJoinServer: () => void;
    onCreateChannel: () => void;
    onInvite: () => void;
    onOpenSettings: () => void;
    onOpenServerSettings: () => void;

    friendList: FriendListEntry[];
    openDirectDM: (friendUserId: string) => void;
    upsertDMConversation: (conversation: DMConversationData) => void;

    activeDMCall: ActiveDMCall | null;
    closeDMCall: () => void;
    onStartDMCall: (conversationId: string, withVideo: boolean) => Promise<void>;

    showVoiceView: boolean;
    setShowVoiceView: (updater: boolean | ((v: boolean) => boolean)) => void;

    subscribe: (channelId: string) => void;
    unsubscribe: (channelId: string) => void;
    sendTypingStart: (channelId: string) => void;
    sendTypingStop: (channelId: string) => void;
    subscribeDM: (conversationId: string) => void;
    unsubscribeDM: (conversationId: string) => void;
    sendDMTypingStart: (conversationId: string) => void;
    sendDMTypingStop: (conversationId: string) => void;

    sidebarWidth: number;
    onSidebarResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function NewShell(props: NewShellProps) {
    const [homeTab, setHomeTab] = useState<"home" | "friends">("home");
    const [focusMode, setFocusMode] = useState(false);

    // Focus mode (⌘\ / Ctrl+\) hides the sidebar for distraction-free reading.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
                e.preventDefault();
                setFocusMode((v) => !v);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const servers = useAppStore((s) => s.servers);
    const channels = useAppStore((s) => s.channels);
    const dmConversations = useAppStore((s) => s.dmConversations);
    const activeServerId = useAppStore((s) => s.activeServerId);
    const activeChannelId = useAppStore((s) => s.activeChannelId);
    const activeDMConversationId = useAppStore((s) => s.activeDMConversationId);

    const currentVoiceChannelId = useVoiceStore((s) => s.currentChannelId);
    const currentChannelType = useVoiceStore((s) => s.currentChannelType);

    const activeServer = servers.find((s) => s.id === activeServerId) ?? null;
    const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null;
    const activeDMConversation =
        dmConversations.find((c) => c.id === activeDMConversationId) ?? null;
    const activeCallConversation = props.activeDMCall
        ? dmConversations.find((c) => c.id === props.activeDMCall!.conversationId)
        : null;
    const activeCallForConversation =
        activeDMConversation &&
        props.activeDMCall?.conversationId === activeDMConversation.id
            ? props.activeDMCall
            : null;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background lg:flex-row">
            {!focusMode && (
                <>
                    <Sidebar
                        onCreateServer={props.onCreateServer}
                        onJoinServer={props.onJoinServer}
                        onCreateChannel={props.onCreateChannel}
                        onInvite={props.onInvite}
                        onOpenSettings={props.onOpenSettings}
                        onOpenServerSettings={props.onOpenServerSettings}
                        width={props.sidebarWidth}
                    />

                    <div
                        onPointerDown={props.onSidebarResizeStart}
                        className="hidden w-[3px] flex-shrink-0 cursor-col-resize bg-border-subtle transition-colors hover:bg-accent/25 active:bg-accent/40 lg:block"
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize sidebar"
                        title="Drag to resize"
                    />
                </>
            )}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {props.activeDMCall && (
                    <CallModal
                        onClose={props.closeDMCall}
                        token={props.activeDMCall.token}
                        url={props.activeDMCall.url}
                        initialVideo={props.activeDMCall.initialVideo}
                        participants={activeCallConversation?.participants || []}
                    />
                )}

                {activeServerId === null ? (
                    activeDMConversation ? (
                        <DMChatView
                            conversation={activeDMConversation}
                            onConversationUpdated={props.upsertDMConversation}
                            onSubscribeDM={props.subscribeDM}
                            onUnsubscribeDM={props.unsubscribeDM}
                            onDMTypingStart={props.sendDMTypingStart}
                            onDMTypingStop={props.sendDMTypingStop}
                            onStartCall={props.onStartDMCall}
                            activeCall={activeCallForConversation}
                        />
                    ) : (
                        <div className="flex min-h-0 flex-1 flex-col">
                            {/* Home / Friends switch */}
                            <div className="flex h-[52px] flex-shrink-0 items-center gap-1 border-b border-border-subtle px-4">
                                {(["home", "friends"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setHomeTab(tab)}
                                        className={`rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                                            homeTab === tab
                                                ? "bg-active-row text-text-primary"
                                                : "text-text-muted hover:bg-hover-row hover:text-text-secondary"
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            {homeTab === "home" ? (
                                <HomeHub
                                    onCreateServer={props.onCreateServer}
                                    onJoinServer={props.onJoinServer}
                                    friends={props.friendList}
                                />
                            ) : (
                                <FriendsView onMessageFriend={props.openDirectDM} />
                            )}
                        </div>
                    )
                ) : props.showVoiceView && currentVoiceChannelId ? (
                    currentChannelType === "stage" ? (
                        <StageChannelView
                            serverRole={activeServer?.role}
                            serverOwnerId={activeServer?.ownerId}
                        />
                    ) : (
                        <VoiceChannelView />
                    )
                ) : activeChannelId && activeChannel ? (
                    <ChatView
                        channelId={activeChannelId}
                        channelName={activeChannel.name}
                        channelDescription={activeChannel.topic}
                        onSubscribe={props.subscribe}
                        onUnsubscribe={props.unsubscribe}
                        onTypingStart={props.sendTypingStart}
                        onTypingStop={props.sendTypingStop}
                    />
                ) : (
                    <div className="flex flex-1 items-center justify-center bg-background">
                        <div className="max-w-sm text-center">
                            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-raised">
                                <Hash className="h-5 w-5 text-text-faint" />
                            </div>
                            <h2 className="mb-1.5 text-[16px] font-semibold tracking-[-0.01em] text-text-primary">
                                Select a channel
                            </h2>
                            <p className="text-[13px] text-text-muted">
                                Choose a channel from the sidebar to start chatting.
                            </p>
                        </div>
                    </div>
                )}

                {currentVoiceChannelId && (
                    <VoiceControlBar
                        onToggleVoiceView={() => props.setShowVoiceView((v) => !v)}
                    />
                )}
            </div>

            {/* Right context panel — members of the active space */}
            {!focusMode &&
                activeServerId !== null &&
                activeChannel !== null &&
                !props.showVoiceView && (
                    <ContextPanel
                        serverId={activeServerId}
                        onMessageMember={props.openDirectDM}
                    />
                )}
        </div>
    );
}
