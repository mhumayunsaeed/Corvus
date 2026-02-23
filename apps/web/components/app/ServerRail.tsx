"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Compass, Settings, LogOut, Circle } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";

interface ServerRailProps {
    onCreateServer: () => void;
    onJoinServer: () => void;
    onOpenSettings: () => void;
}

const statusColors: Record<string, string> = {
    online: "#3ECF8E",
    idle: "#F59E0B",
    dnd: "#F75F6E",
    invisible: "#6B7280",
    offline: "#6B7280",
};

const statusLabels: Record<string, string> = {
    online: "Online",
    idle: "Idle",
    dnd: "Do Not Disturb",
    invisible: "Invisible",
    offline: "Offline",
};

export function ServerRail({ onCreateServer, onJoinServer, onOpenSettings }: ServerRailProps) {
    const railRef = useRef<HTMLDivElement>(null);
    const serverIconsRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const router = useRouter();
    const { user, logout, setStatus } = useAuthStore();

    const servers = useAppStore((s) => s.servers);
    const activeServerId = useAppStore((s) => s.activeServerId);
    const setActiveServer = useAppStore((s) => s.setActiveServer);
    const setActiveDMConversation = useAppStore((s) => s.setActiveDMConversation);

    /* GSAP stagger mount */
    useEffect(() => {
        let ctx: { revert: () => void } | undefined;
        async function animate() {
            const gsapModule = await import("gsap");
            const gsap = gsapModule.default;
            ctx = gsap.context(() => {
                if (serverIconsRef.current) {
                    gsap.fromTo(
                        serverIconsRef.current.children,
                        { opacity: 0, y: 8 },
                        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" }
                    );
                }
            }, railRef);
        }
        animate();
        return () => ctx?.revert();
    }, [servers]);

    /* Click-outside to close menu */
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        }
        if (showUserMenu) {
            document.addEventListener("mousedown", handleClick);
        }
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showUserMenu]);

    const handleLogout = () => {
        setShowUserMenu(false);
        logout();
        router.push("/login");
    };

    const handleStatusChange = (status: "online" | "idle" | "dnd" | "invisible" | "offline") => {
        setStatus(status);
        setShowUserMenu(false);
    };

    const currentUserStatus = user?.status || "online";
    const currentUserAvatar = user?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user?.username || "user"}`;

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
            className="w-full lg:w-[68px] bg-background flex flex-row lg:flex-col items-center py-2 lg:py-3 px-2 lg:px-0 gap-2 border-b lg:border-b-0 lg:border-r border-border flex-shrink-0"
        >
            {/* Veyra Home */}
            <div className="relative group">
                <button
                    onClick={() => {
                        setActiveServer(null);
                        setActiveDMConversation(null);
                    }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-violet to-accent-teal hover:rounded-xl flex items-center justify-center transition-all duration-200 group-hover:shadow-glow"
                >
                    <span className="text-white font-bold text-lg">V</span>
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface border border-border rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-lg">
                    Home
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-surface border-l border-b border-border rotate-45" />
                </div>
            </div>

            <div className="h-8 w-[2px] lg:h-[2px] lg:w-8 bg-border rounded-full" />

            {/* Server icons */}
            <div
                ref={serverIconsRef}
                className="flex-1 min-w-0 flex flex-row lg:flex-col items-center gap-2 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto scrollbar-none py-1"
            >
                {servers.map((server) => {
                    const isActive = server.id === activeServerId;
                    return (
                        <div key={server.id} className="relative group">
                            <div
                                className={`absolute -left-[14px] top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-accent-violet transition-all duration-200 ${isActive ? "h-10 opacity-100" : "h-0 opacity-0 group-hover:h-5 group-hover:opacity-100"
                                    }`}
                            />

                            <button
                                onClick={() => setActiveServer(server.id)}
                                className={`w-12 h-12 rounded-2xl hover:rounded-xl flex items-center justify-center transition-all duration-200 overflow-hidden relative ${isActive
                                        ? "rounded-xl shadow-glow ring-1 ring-accent-violet/30"
                                        : ""
                                    }`}
                            >
                                {server.iconUrl ? (
                                    <img
                                        src={server.iconUrl}
                                        alt={server.name}
                                        className="w-full h-full object-cover bg-surface"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-surface flex items-center justify-center text-text-primary font-semibold text-body">
                                        {getServerInitials(server.name)}
                                    </div>
                                )}
                            </button>

                            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface border border-border rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-lg">
                                {server.name}
                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-surface border-l border-b border-border rotate-45" />
                            </div>
                        </div>
                    );
                })}

                {/* Add Server */}
                <div className="relative group">
                    <button
                        onClick={onCreateServer}
                        className="w-12 h-12 rounded-2xl hover:rounded-xl bg-surface hover:bg-success border border-border hover:border-success flex items-center justify-center transition-all duration-200"
                    >
                        <Plus className="w-5 h-5 text-success group-hover:text-white transition-colors" />
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface border border-border rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-lg">
                        Add a Server
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-surface border-l border-b border-border rotate-45" />
                    </div>
                </div>

                {/* Join Server */}
                <div className="relative group">
                    <button
                        onClick={onJoinServer}
                        className="w-12 h-12 rounded-2xl hover:rounded-xl bg-surface hover:bg-success border border-border hover:border-success flex items-center justify-center transition-all duration-200"
                    >
                        <Compass className="w-5 h-5 text-success group-hover:text-white transition-colors" />
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface border border-border rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-lg">
                        Join a Server
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-surface border-l border-b border-border rotate-45" />
                    </div>
                </div>
            </div>

            {/* Current User */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`w-12 h-12 rounded-full border-2 transition-all relative ${showUserMenu
                            ? "border-accent-violet/60 shadow-glow"
                            : "border-border hover:border-accent-violet/50"
                        }`}
                >
                    <img
                        src={currentUserAvatar}
                        alt="Your avatar"
                        className="w-full h-full object-cover rounded-full"
                    />
                    <div
                        className="absolute bottom-0 right-0 translate-x-[10%] translate-y-[10%] w-3.5 h-3.5 rounded-full ring-2 ring-background"
                        style={{ backgroundColor: statusColors[currentUserStatus] }}
                    />
                </button>

                {showUserMenu && (
                    <div className="absolute right-0 lg:right-auto lg:left-full bottom-full lg:bottom-0 mb-2 lg:mb-0 lg:ml-3 w-56 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-sm font-semibold text-text-primary truncate">
                                {user?.displayName || "User"}
                            </p>
                            <p className="text-micro text-text-muted truncate">
                                @{user?.username || "user"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <Circle
                                    className="w-2.5 h-2.5 fill-current"
                                    style={{ color: statusColors[currentUserStatus] }}
                                />
                                <span className="text-micro text-text-muted">
                                    {statusLabels[currentUserStatus]}
                                </span>
                            </div>
                        </div>

                        <div className="px-2 py-1.5 border-b border-border">
                            <p className="px-2 py-1 text-micro text-text-muted font-semibold uppercase tracking-wider">
                                Set Status
                            </p>
                            {(["online", "idle", "dnd", "invisible", "offline"] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleStatusChange(s)}
                                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${currentUserStatus === s
                                            ? "bg-accent-violet/10 text-accent-violet"
                                            : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                                        }`}
                                >
                                    <Circle
                                        className="w-2.5 h-2.5 fill-current flex-shrink-0"
                                        style={{ color: statusColors[s] }}
                                    />
                                    {statusLabels[s]}
                                </button>
                            ))}
                        </div>

                        <div className="px-2 py-1.5">
                            <button
                                onClick={() => {
                                    setShowUserMenu(false);
                                    onOpenSettings();
                                }}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-hover-row hover:text-text-primary transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
