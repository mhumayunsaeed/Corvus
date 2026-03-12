"use client";

import { useState, useEffect, useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import {
    ServerRail,
    ChannelList,
    ChatView,
    DMSidebar,
    DMChatView,
    CallModal,
    FriendsView,
    CreateServerModal,
    CreateChannelModal,
    InviteModal,
    UserSettingsModal,
    ServerSettingsModal,
} from "@/components/app";
import { ToastContainer } from "@/components/app/ToastNotification";
import { VoiceChannelView } from "@/components/app/VoiceChannelView";
import { StageChannelView } from "@/components/app/StageChannelView";
import { VoiceControlBar } from "@/components/app/VoiceControlBar";
import { IncomingCallNotification } from "@/components/app/IncomingCallNotification";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useVoiceStore } from "@/stores/voice-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePushToTalk } from "@/hooks/usePushToTalk";
import { useDesktop } from "@/hooks/useDesktop";
import { useMessageCache } from "@/hooks/useMessageCache";
import { syncNotificationBadge } from "@/lib/notifications";
import {
    createDMConversation,
    fetchDMConversations,
    fetchFriendDashboard,
    fetchServer,
    fetchServers,
    fetchServerVoiceStates,
    leaveDMCall,
    markChannelReadApi,
    markDMReadApi,
    startDMCall,
    type FriendListEntry,
} from "@/lib/api";
import { Hash, Loader2 } from "lucide-react";

interface ActiveDMCall {
    conversationId: string;
    token: string;
    url: string;
    initialVideo: boolean;
}

const MIN_LEFT_PANE_WIDTH = 280;

export default function AppPage() {
    const [showCreateServer, setShowCreateServer] = useState(false);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [showInviteCreate, setShowInviteCreate] = useState(false);
    const [showInviteJoin, setShowInviteJoin] = useState(false);
    const [showVoiceView, setShowVoiceView] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showServerSettings, setShowServerSettings] = useState(false);
    const [activeDMCall, setActiveDMCall] = useState<ActiveDMCall | null>(null);
    const [loading, setLoading] = useState(true);
    const [friendList, setFriendList] = useState<FriendListEntry[]>([]);
    const [serverPaneWidth, setServerPaneWidth] = useState(360);
    const [dmPaneWidth, setDmPaneWidth] = useState(360);
    const subscribedDMRef = useRef<Set<string>>(new Set());
    const subscribedBgServersRef = useRef<Set<string>>(new Set());

    const servers = useAppStore((s) => s.servers);
    const activeServerId = useAppStore((s) => s.activeServerId);
    const activeChannelId = useAppStore((s) => s.activeChannelId);
    const activeDMConversationId = useAppStore((s) => s.activeDMConversationId);
    const channels = useAppStore((s) => s.channels);
    const dmConversations = useAppStore((s) => s.dmConversations);
    const setServers = useAppStore((s) => s.setServers);
    const setChannels = useAppStore((s) => s.setChannels);
    const setDMConversations = useAppStore((s) => s.setDMConversations);
    const setActiveChannel = useAppStore((s) => s.setActiveChannel);
    const setActiveDMConversation = useAppStore((s) => s.setActiveDMConversation);
    const upsertDMConversation = useAppStore((s) => s.upsertDMConversation);
    const user = useAuthStore((s) => s.user);
    const markChannelRead = useNotificationStore((s) => s.markChannelRead);
    const markDMRead = useNotificationStore((s) => s.markDMRead);
    const registerChannelsForServer = useNotificationStore((s) => s.registerChannelsForServer);
    const setChannelUnreadBatch = useNotificationStore((s) => s.setChannelUnreadBatch);
    const setDMUnreadBatch = useNotificationStore((s) => s.setDMUnreadBatch);
    const badgeEnabled = useNotificationStore((s) => s.preferences.enableTaskbarBadge);
    const totalUnread = useNotificationStore(
        (s) =>
            Object.values(s.channelUnread).reduce((sum, count) => sum + count, 0) +
            Object.values(s.dmUnread).reduce((sum, count) => sum + count, 0)
    );

    const currentVoiceChannelId = useVoiceStore((s) => s.currentChannelId);
    const currentChannelType = useVoiceStore((s) => s.currentChannelType);
    const setAllChannelParticipants = useVoiceStore((s) => s.setAllChannelParticipants);

    // LiveKit room ref for control bar actions
    const livekitRoomRef = useRef<any>(null);

    // Push-to-talk for Tauri desktop
    usePushToTalk();

    // Setup desktop plugins like updater, tray events, notifications
    useDesktop();

    // Setup offline cache for Tauri desktop
    useMessageCache();

    const {
        subscribe,
        unsubscribe,
        sendTypingStart,
        sendTypingStop,
        subscribeDM,
        unsubscribeDM,
        sendDMTypingStart,
        sendDMTypingStop,
    } = useWebSocket();

    // Load servers on mount
    useEffect(() => {
        fetchServers()
            .then((result) => {
                setServers(result.servers);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Background-subscribe to channels for all servers (for cross-server notifications)
    useEffect(() => {
        if (servers.length === 0) return;

        const subscribeServerChannels = async (server: typeof servers[0]) => {
            if (subscribedBgServersRef.current.has(server.id)) return;
            subscribedBgServersRef.current.add(server.id);
            try {
                const result = await fetchServer(server.id);
                const textChannels = result.server.channels.filter((c: { type: string }) => c.type === "text");
                const channelIds = textChannels.map((c: { id: string }) => c.id);
                registerChannelsForServer(server.id, channelIds);
                // Initialize unread counts from server response
                if (result.unreadCounts) {
                    setChannelUnreadBatch(result.unreadCounts);
                }
                for (const ch of textChannels) {
                    subscribe(ch.id);
                }
            } catch {
                subscribedBgServersRef.current.delete(server.id);
            }
        };

        // Stagger subscriptions to avoid thundering herd
        servers.forEach((server, i) => {
            setTimeout(() => subscribeServerChannels(server), i * 200);
        });
    }, [servers, subscribe, registerChannelsForServer]);

    // Load channels + voice states when server changes
    useEffect(() => {
        if (!activeServerId) {
            setChannels([]);
            return;
        }

        fetchServer(activeServerId)
            .then((result) => {
                setChannels(result.server.channels);
                const firstTextChannel = result.server.channels.find((c) => c.type === "text");
                if (firstTextChannel && !activeChannelId) {
                    setActiveChannel(firstTextChannel.id);
                }
            })
            .catch(console.error);

        // Load voice channel states for this server
        fetchServerVoiceStates(activeServerId)
            .then((result) => {
                setAllChannelParticipants(result.voiceStates);
            })
            .catch(console.error);
    }, [activeServerId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-select first text channel when channels change and no channel is selected
    useEffect(() => {
        if (channels.length > 0 && !activeChannelId) {
            const firstTextChannel = channels.find((c) => c.type === "text");
            if (firstTextChannel) {
                setActiveChannel(firstTextChannel.id);
            }
        }
    }, [channels, activeChannelId, setActiveChannel]);

    // Load DM conversations + friends when on home/DM mode
    useEffect(() => {
        if (activeServerId !== null) return;

        Promise.all([fetchDMConversations(), fetchFriendDashboard()])
            .then(([dmResult, friendResult]) => {
                setDMConversations(dmResult.conversations);
                setFriendList(friendResult.friends);

                // Initialize DM unread counts from server response
                if (dmResult.dmUnreadCounts) {
                    setDMUnreadBatch(dmResult.dmUnreadCounts);
                }

                const currentActiveDM = useAppStore.getState().activeDMConversationId;
                if (
                    currentActiveDM &&
                    !dmResult.conversations.some((c: { id: string }) => c.id === currentActiveDM)
                ) {
                    setActiveDMConversation(null);
                }
            })
            .catch(console.error);
    }, [
        activeServerId,
        setDMConversations,
        setActiveDMConversation,
    ]);

    useEffect(() => {
        const handlePresenceUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<{
                userId?: string;
                status?: string;
            }>;
            const changedUserId = customEvent.detail?.userId;
            const status = customEvent.detail?.status;

            if (
                typeof changedUserId !== "string" ||
                typeof status !== "string"
            ) {
                return;
            }

            setFriendList((previous) => {
                let changed = false;
                const next = previous.map((entry) => {
                    if (
                        entry.user.id !== changedUserId ||
                        entry.user.status === status
                    ) {
                        return entry;
                    }

                    changed = true;
                    return {
                        ...entry,
                        user: {
                            ...entry.user,
                            status,
                        },
                    };
                });

                return changed ? next : previous;
            });
        };

        window.addEventListener("corvus:presence_update", handlePresenceUpdate as EventListener);
        return () => {
            window.removeEventListener(
                "corvus:presence_update",
                handlePresenceUpdate as EventListener
            );
        };
    }, []);

    useEffect(() => {
        if (!activeChannelId) return;
        markChannelRead(activeChannelId);
        markChannelReadApi(activeChannelId).catch(() => {});
    }, [activeChannelId, markChannelRead]);

    useEffect(() => {
        if (!activeDMConversationId) return;
        markDMRead(activeDMConversationId);
        markDMReadApi(activeDMConversationId).catch(() => {});
    }, [activeDMConversationId, markDMRead]);

    useEffect(() => {
        const onFocus = () => {
            const state = useAppStore.getState();
            if (state.activeChannelId) {
                markChannelRead(state.activeChannelId);
                markChannelReadApi(state.activeChannelId).catch(() => {});
            }
            if (state.activeDMConversationId) {
                markDMRead(state.activeDMConversationId);
                markDMReadApi(state.activeDMConversationId).catch(() => {});
            }
        };

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [markChannelRead, markDMRead]);

    useEffect(() => {
        syncNotificationBadge(totalUnread, badgeEnabled).catch((err) => {
            console.error("Failed to sync notification badge:", err);
        });
    }, [totalUnread, badgeEnabled]);

    useEffect(() => {
        return () => {
            syncNotificationBadge(0, false).catch(() => {
                // Ignore cleanup errors on navigation.
            });
        };
    }, []);

    const startHorizontalResize = useCallback(
        (
            event: ReactPointerEvent<HTMLDivElement>,
            startWidth: number,
            applyWidth: (nextWidth: number) => void
        ) => {
            if (typeof window === "undefined" || window.innerWidth < 1024) {
                return;
            }

            event.preventDefault();
            const startX = event.clientX;
            const maxWidth = Math.max(
                MIN_LEFT_PANE_WIDTH + 80,
                Math.min(680, Math.floor(window.innerWidth * 0.5))
            );
            const previousCursor = document.body.style.cursor;
            const previousUserSelect = document.body.style.userSelect;

            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";

            const handleMove = (moveEvent: PointerEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const nextWidth = Math.max(
                    MIN_LEFT_PANE_WIDTH,
                    Math.min(maxWidth, startWidth + deltaX)
                );
                applyWidth(nextWidth);
            };

            const stopResize = () => {
                document.body.style.cursor = previousCursor;
                document.body.style.userSelect = previousUserSelect;
                window.removeEventListener("pointermove", handleMove);
                window.removeEventListener("pointerup", stopResize);
                window.removeEventListener("pointercancel", stopResize);
            };

            window.addEventListener("pointermove", handleMove);
            window.addEventListener("pointerup", stopResize);
            window.addEventListener("pointercancel", stopResize);
        },
        []
    );

    const handleServerPaneResizeStart = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            startHorizontalResize(event, serverPaneWidth, setServerPaneWidth);
        },
        [serverPaneWidth, startHorizontalResize]
    );

    const handleDMPaneResizeStart = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            startHorizontalResize(event, dmPaneWidth, setDmPaneWidth);
        },
        [dmPaneWidth, startHorizontalResize]
    );

    const openDirectDM = async (friendUserId: string) => {
        const result = await createDMConversation({ participantIds: [friendUserId] });
        upsertDMConversation(result.conversation);
        setActiveDMConversation(result.conversation.id);
    };

    const createGroupDM = async (participantIds: string[], name?: string) => {
        const result = await createDMConversation({ participantIds, name });
        upsertDMConversation(result.conversation);
        setActiveDMConversation(result.conversation.id);
    };

    const handleStartDMCall = useCallback(
        async (conversationId: string, withVideo: boolean) => {
            const result = await startDMCall(conversationId);
            setActiveDMCall({
                conversationId,
                token: result.token,
                url: result.url,
                initialVideo: withVideo,
            });
        },
        []
    );

    const closeDMCall = useCallback(async () => {
        const conversationId = activeDMCall?.conversationId;
        setActiveDMCall(null);
        if (!conversationId) return;

        try {
            await leaveDMCall(conversationId);
        } catch (err) {
            console.error("Failed to leave DM call:", err);
        }
    }, [activeDMCall?.conversationId]);

    // Keep websocket DM subscriptions in sync
    useEffect(() => {
        if (activeServerId !== null) {
            for (const conversationId of subscribedDMRef.current) {
                unsubscribeDM(conversationId);
            }
            subscribedDMRef.current = new Set();
            return;
        }

        const nextSet = new Set(dmConversations.map((c) => c.id));

        for (const conversationId of nextSet) {
            if (!subscribedDMRef.current.has(conversationId)) {
                subscribeDM(conversationId);
            }
        }

        for (const conversationId of subscribedDMRef.current) {
            if (!nextSet.has(conversationId)) {
                unsubscribeDM(conversationId);
            }
        }

        subscribedDMRef.current = nextSet;
    }, [activeServerId, dmConversations, subscribeDM, unsubscribeDM]);

    useEffect(() => {
        return () => {
            for (const conversationId of subscribedDMRef.current) {
                unsubscribeDM(conversationId);
            }
            subscribedDMRef.current = new Set();
        };
    }, [unsubscribeDM]);

    useEffect(() => {
        const handleCallEnded = (event: Event) => {
            const custom = event as CustomEvent<{ conversationId?: string }>;
            const endedConversationId = custom.detail?.conversationId;
            if (!endedConversationId) {
                setActiveDMCall(null);
                return;
            }

            setActiveDMCall((prev) =>
                prev?.conversationId === endedConversationId ? null : prev
            );
        };

        window.addEventListener("corvus:call_ended", handleCallEnded);
        return () => {
            window.removeEventListener("corvus:call_ended", handleCallEnded);
        };
    }, []);

    // Auto-show voice view when joining a voice channel
    useEffect(() => {
        if (currentVoiceChannelId) {
            setShowVoiceView(true);
        }
    }, [currentVoiceChannelId]);

    // Subscribe to voice channel for WS events
    useEffect(() => {
        if (currentVoiceChannelId) {
            subscribe(currentVoiceChannelId);
            return () => {
                unsubscribe(currentVoiceChannelId);
            };
        }
    }, [currentVoiceChannelId, subscribe, unsubscribe]);

    const activeServer = servers.find((s) => s.id === activeServerId);
    const activeChannel = channels.find((c) => c.id === activeChannelId);
    const activeDMConversation = dmConversations.find(
        (c) => c.id === activeDMConversationId
    );
    const activeCallConversation = activeDMCall
        ? dmConversations.find((c) => c.id === activeDMCall.conversationId)
        : null;
    const activeCallForConversation =
        activeDMConversation && activeDMCall?.conversationId === activeDMConversation.id
            ? activeDMCall
            : null;
    const existingCategories = Array.from(new Set(channels.map((c) => c.category)));

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-accent-violet animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background lg:flex-row">
            {/* Server Rail */}
            <ServerRail
                onCreateServer={() => setShowCreateServer(true)}
                onJoinServer={() => setShowInviteJoin(true)}
            />

            {/* Channel Sidebar — only show when a server is selected */}
            {activeServerId && activeServer && (
                <ChannelList
                    serverName={activeServer.name}
                    serverId={activeServerId}
                    serverRole={activeServer.role || "member"}
                    serverOwnerId={activeServer.ownerId || ""}
                    onCreateChannel={() => setShowCreateChannel(true)}
                    onInvite={() => setShowInviteCreate(true)}
                    onOpenSettings={() => setShowSettings(true)}
                    onOpenServerSettings={() => setShowServerSettings(true)}
                    panelWidth={serverPaneWidth}
                />
            )}

            {activeServerId && activeServer && (
                <div
                    onPointerDown={handleServerPaneResizeStart}
                    className="hidden lg:block w-1 bg-border-subtle hover:bg-accent-violet/30 cursor-col-resize flex-shrink-0 transition-colors"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize channel pane"
                    title="Drag to resize"
                />
            )}

            {/* Content Area */}
            <div className="flex-1 min-h-0 min-w-0 flex flex-col">
                {activeDMCall && (
                    <CallModal
                        onClose={closeDMCall}
                        token={activeDMCall.token}
                        url={activeDMCall.url}
                        initialVideo={activeDMCall.initialVideo}
                        participants={activeCallConversation?.participants || []}
                    />
                )}

                {!activeServerId ? (
                    <div className="flex-1 min-h-0 min-w-0 flex flex-col lg:flex-row">
                        <DMSidebar
                            conversations={dmConversations}
                            friends={friendList}
                            activeConversationId={activeDMConversationId}
                            onSelectConversation={setActiveDMConversation}
                            onCreateGroup={createGroupDM}
                            onOpenSettings={() => setShowSettings(true)}
                            panelWidth={dmPaneWidth}
                        />

                        <div
                            onPointerDown={handleDMPaneResizeStart}
                            className="hidden lg:block w-1 bg-border-subtle hover:bg-accent-violet/30 cursor-col-resize flex-shrink-0 transition-colors"
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize DM pane"
                            title="Drag to resize"
                        />

                        {activeDMConversation ? (
                            <DMChatView
                                conversation={activeDMConversation}
                                onConversationUpdated={upsertDMConversation}
                                onSubscribeDM={subscribeDM}
                                onUnsubscribeDM={unsubscribeDM}
                                onDMTypingStart={sendDMTypingStart}
                                onDMTypingStop={sendDMTypingStop}
                                onStartCall={handleStartDMCall}
                                activeCall={activeCallForConversation}
                            />
                        ) : (
                            <FriendsView onMessageFriend={openDirectDM} />
                        )}
                    </div>
                ) : showVoiceView && currentVoiceChannelId ? (
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
                        onSubscribe={subscribe}
                        onUnsubscribe={unsubscribe}
                        onTypingStart={sendTypingStart}
                        onTypingStop={sendTypingStop}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-background">
                        <div className="text-center">
                            {servers.length === 0 ? (
                                <>
                                    <img src="/corvus-logo.png" alt="Corvus" className="w-16 h-16 rounded-full mx-auto mb-4" />
                                    <h2 className="text-heading font-bold text-text-primary mb-2">
                                        Welcome to Corvus
                                    </h2>
                                    <p className="text-body text-text-muted mb-6 max-w-sm">
                                        Create a server to get started, or join an existing one with an invite link.
                                    </p>
                                    <div className="flex gap-3 justify-center">
                                        <button
                                            onClick={() => setShowCreateServer(true)}
                                            className="px-6 py-2.5 bg-accent-violet text-white rounded-xl font-medium text-body hover:bg-accent-violet/90 transition-all"
                                        >
                                            Create a Server
                                        </button>
                                        <button
                                            onClick={() => setShowInviteJoin(true)}
                                            className="px-6 py-2.5 bg-surface border border-border text-text-primary rounded-xl font-medium text-body hover:bg-surface-raised transition-all"
                                        >
                                            Join a Server
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Hash className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-30" />
                                    <h2 className="text-heading font-bold text-text-primary mb-1">
                                        Select a channel
                                    </h2>
                                    <p className="text-body text-text-muted">
                                        Choose a channel from the sidebar to start chatting.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Voice Control Bar - shows when connected to a voice channel */}
                {currentVoiceChannelId && (
                    <VoiceControlBar
                        onToggleVoiceView={() => setShowVoiceView((v) => !v)}
                    />
                )}
            </div>

            {/* Modals */}
            <CreateServerModal
                open={showCreateServer}
                onClose={() => setShowCreateServer(false)}
            />

            {activeServerId && (
                <>
                    <CreateChannelModal
                        open={showCreateChannel}
                        onClose={() => setShowCreateChannel(false)}
                        serverId={activeServerId}
                        existingCategories={existingCategories.length > 0 ? existingCategories : ["General"]}
                    />

                    <InviteModal
                        open={showInviteCreate}
                        onClose={() => setShowInviteCreate(false)}
                        mode="create"
                        serverId={activeServerId}
                        serverName={activeServer?.name}
                    />
                </>
            )}

            <InviteModal
                open={showInviteJoin}
                onClose={() => setShowInviteJoin(false)}
                mode="join"
            />

            {/* Incoming Call Notification */}
            <IncomingCallNotification
                onAccept={(data) => {
                    setActiveDMConversation(data.conversationId);
                    setActiveDMCall({
                        conversationId: data.conversationId,
                        token: data.token,
                        url: data.url,
                        initialVideo: false,
                    });
                }}
                onDecline={() => {
                    // no-op for now
                }}
            />

            <UserSettingsModal
                open={showSettings}
                onClose={() => setShowSettings(false)}
            />

            {activeServerId && activeServer && (
                <ServerSettingsModal
                    open={showServerSettings}
                    onClose={() => setShowServerSettings(false)}
                    serverId={activeServerId}
                    serverName={activeServer.name}
                    serverDescription={activeServer.description}
                    serverIconUrl={activeServer.iconUrl}
                    serverOwnerId={activeServer.ownerId}
                    serverRole={activeServer.role || "member"}
                />
            )}

            <ToastContainer />
        </div>
    );
}
