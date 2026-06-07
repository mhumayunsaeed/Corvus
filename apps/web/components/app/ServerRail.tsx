"use client";

import { useEffect, useRef } from "react";
import { Plus, Compass } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useNotificationStore, getServerUnreadCounts } from "@/stores/notification-store";

interface ServerRailProps {
    onCreateServer: () => void;
    onJoinServer: () => void;
}

export function ServerRail({ onCreateServer, onJoinServer }: ServerRailProps) {
    const railRef = useRef<HTMLDivElement>(null);
    const serverIconsRef = useRef<HTMLDivElement>(null);

    const servers = useAppStore((s) => s.servers);
    const activeServerId = useAppStore((s) => s.activeServerId);
    const setActiveServer = useAppStore((s) => s.setActiveServer);
    const setActiveDMConversation = useAppStore((s) => s.setActiveDMConversation);
    const channelUnread = useNotificationStore((s) => s.channelUnread);
    const channelMentions = useNotificationStore((s) => s.channelMentions);
    const channelServerMap = useNotificationStore((s) => s.channelServerMap);
    const dmUnread = useNotificationStore((s) => s.dmUnread);

    const serverUnreadCounts = getServerUnreadCounts(channelServerMap, channelUnread, channelMentions);
    const totalDMUnread = Object.values(dmUnread).reduce((sum, n) => sum + n, 0);

    useEffect(() => {
        let ctx: { revert: () => void } | undefined;
        async function animate() {
            const gsapModule = await import("gsap");
            const gsap = gsapModule.default;
            ctx = gsap.context(() => {
                if (serverIconsRef.current) {
                    gsap.fromTo(
                        serverIconsRef.current.children,
                        { opacity: 0, y: 10, scale: 0.85 },
                        { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.055, ease: "back.out(1.4)" }
                    );
                }
            }, railRef);
        }
        animate();
        return () => ctx?.revert();
    }, [servers]);

    const getServerInitials = (name: string) =>
        name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

    return (
        <div
            ref={railRef}
            className="w-full lg:w-[72px] bg-bg-deep flex flex-row lg:flex-col items-center py-2 lg:py-3 px-2 lg:px-0 gap-1.5 border-b lg:border-b-0 lg:border-r border-border-subtle flex-shrink-0"
        >
            {/* Home / DM button */}
            <div className="relative group flex-shrink-0">
                <button
                    onClick={() => {
                        setActiveServer(null);
                        setActiveDMConversation(null);
                    }}
                    className={`w-11 h-11 rounded-[22px] flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
                        activeServerId === null
                            ? "rounded-[14px] shadow-glow"
                            : "hover:rounded-[14px]"
                    }`}
                    style={
                        activeServerId === null
                            ? { background: "linear-gradient(135deg, #7C6AF7 0%, #5B4FBD 100%)" }
                            : { background: "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)" }
                    }
                >
                    {/* Subtle shimmer overlay on active */}
                    {activeServerId === null && (
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    )}
                    <img
                        src="/Corvus.png"
                        alt="Corvus"
                        className="relative z-10 h-full w-full object-cover"
                    />
                </button>
                {/* Active indicator pill */}
                {activeServerId === null && (
                    <div className="absolute -left-[10px] top-1/2 -translate-y-1/2 w-[3px] h-9 rounded-r-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
                )}
                {/* DM unread badge */}
                {activeServerId !== null && totalDMUnread > 0 && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-[18px] text-center border-2 border-bg-deep shadow-sm">
                        {totalDMUnread > 99 ? "99+" : totalDMUnread}
                    </div>
                )}
                {/* Tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-surface-overlay border border-border-highlight rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-float-lg animate-fade-in">
                    <span className="font-medium">Home</span>
                    <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-surface-overlay border-l border-b border-border-highlight rotate-45" />
                </div>
            </div>

            {/* Divider */}
            <div className="h-7 w-px lg:h-px lg:w-7 bg-border rounded-full flex-shrink-0 opacity-60" />

            {/* Scrollable server list */}
            <div
                ref={serverIconsRef}
                className="flex-1 min-h-0 min-w-0 flex flex-row lg:flex-col items-center gap-1.5 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto scrollbar-none py-0.5"
            >
                {servers.map((server) => {
                    const isActive = server.id === activeServerId;
                    const serverBadge = serverUnreadCounts[server.id];
                    const hasUnread = !!serverBadge && serverBadge.unread > 0;
                    const hasMentions = !!serverBadge && serverBadge.mentions > 0;
                    return (
                        <div key={server.id} className="relative group flex-shrink-0">
                            {/* Active / unread indicator pill */}
                            <div
                                className={`absolute -left-[10px] top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-white transition-all duration-300 shadow-[0_0_6px_rgba(255,255,255,0.4)] ${
                                    isActive
                                        ? "h-9 opacity-100"
                                        : hasUnread && !isActive
                                            ? "h-2 opacity-80 group-hover:h-6"
                                            : "h-0 opacity-0 group-hover:h-5 group-hover:opacity-80"
                                }`}
                            />

                            <button
                                onClick={() => setActiveServer(server.id)}
                                className={`w-11 h-11 rounded-[22px] hover:rounded-[14px] flex items-center justify-center transition-all duration-300 overflow-hidden relative ${
                                    isActive ? "rounded-[14px] shadow-glow-sm ring-1 ring-white/8" : ""
                                }`}
                            >
                                {server.iconUrl ? (
                                    <img
                                        src={server.iconUrl}
                                        alt={server.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className={`w-full h-full flex items-center justify-center font-semibold text-[13px] tracking-tight transition-all duration-300 ${
                                            isActive
                                                ? "text-white"
                                                : "bg-surface-raised text-text-secondary hover:text-white group-hover:bg-accent-violet/85"
                                        }`}
                                        style={isActive ? { background: "linear-gradient(135deg, #7C6AF7 0%, #5B4FBD 100%)" } : {}}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-b from-white/8 to-transparent pointer-events-none ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`} />
                                        <span className="relative z-10">{getServerInitials(server.name)}</span>
                                    </div>
                                )}
                            </button>

                            {/* Mention badge */}
                            {hasMentions && (
                                <div className="absolute -bottom-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-[18px] text-center border-2 border-bg-deep shadow-sm">
                                    {serverBadge.mentions > 99 ? "99+" : serverBadge.mentions}
                                </div>
                            )}
                            {/* Unread dot (no mention) */}
                            {hasUnread && !hasMentions && !isActive && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-white border-2 border-bg-deep" />
                            )}

                            {/* Tooltip */}
                            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-surface-overlay border border-border-highlight rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-float-lg animate-fade-in">
                                <span className="font-medium">{server.name}</span>
                                {hasMentions && (
                                    <span className="ml-2 text-danger font-semibold">{serverBadge.mentions} mention{serverBadge.mentions > 1 ? "s" : ""}</span>
                                )}
                                <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-surface-overlay border-l border-b border-border-highlight rotate-45" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="h-7 w-px lg:h-px lg:w-7 bg-border rounded-full flex-shrink-0 opacity-60" />

            {/* Bottom actions */}
            <div className="flex flex-row lg:flex-col items-center gap-1.5 flex-shrink-0">
                {/* Add server */}
                <div className="relative group">
                    <button
                        onClick={onCreateServer}
                        className="w-11 h-11 rounded-[22px] hover:rounded-[14px] bg-surface hover:bg-success/90 border border-border hover:border-success/40 flex items-center justify-center transition-all duration-300 group/btn"
                    >
                        <Plus className="w-[18px] h-[18px] text-success group-hover/btn:text-white transition-colors" />
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-surface-overlay border border-border-highlight rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-float-lg animate-fade-in">
                        <span className="font-medium">Add a Server</span>
                        <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-surface-overlay border-l border-b border-border-highlight rotate-45" />
                    </div>
                </div>

                {/* Join server */}
                <div className="relative group">
                    <button
                        onClick={onJoinServer}
                        className="w-11 h-11 rounded-[22px] hover:rounded-[14px] bg-surface hover:bg-info/90 border border-border hover:border-info/40 flex items-center justify-center transition-all duration-300 group/btn"
                    >
                        <Compass className="w-[18px] h-[18px] text-info group-hover/btn:text-white transition-colors" />
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-surface-overlay border border-border-highlight rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-float-lg animate-fade-in">
                        <span className="font-medium">Join a Server</span>
                        <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-surface-overlay border-l border-b border-border-highlight rotate-45" />
                    </div>
                </div>
            </div>
        </div>
    );
}
