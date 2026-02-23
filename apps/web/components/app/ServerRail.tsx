"use client";

import { useEffect, useRef } from "react";
import { Plus, Compass } from "lucide-react";
import { useAppStore } from "@/stores/app-store";

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
            className="w-full lg:w-[72px] bg-[#0B0D12] flex flex-row lg:flex-col items-center py-2 lg:py-3 px-2 lg:px-0 gap-2 border-b lg:border-b-0 lg:border-r border-[#1F2330] flex-shrink-0"
        >
            <div className="relative group">
                <button
                    onClick={() => {
                        setActiveServer(null);
                        setActiveDMConversation(null);
                    }}
                    className="w-12 h-12 rounded-[24px] bg-[#5865F2] hover:rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:shadow-glow"
                >
                    <span className="text-white font-bold text-lg">V</span>
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface border border-border rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-lg">
                    Home
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-surface border-l border-b border-border rotate-45" />
                </div>
            </div>

            <div className="h-8 w-[2px] lg:h-[2px] lg:w-8 bg-[#202330] rounded-full" />

            <div
                ref={serverIconsRef}
                className="flex-1 min-w-0 flex flex-row lg:flex-col items-center gap-2 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto scrollbar-none py-1"
            >
                {servers.map((server) => {
                    const isActive = server.id === activeServerId;
                    return (
                        <div key={server.id} className="relative group">
                            <div
                                className={`absolute -left-[11px] top-1/2 -translate-y-1/2 w-[4px] rounded-r-full bg-white transition-all duration-200 ${
                                    isActive
                                        ? "h-10 opacity-100"
                                        : "h-0 opacity-0 group-hover:h-5 group-hover:opacity-100"
                                }`}
                            />

                            <button
                                onClick={() => setActiveServer(server.id)}
                                className={`w-12 h-12 rounded-[24px] hover:rounded-2xl flex items-center justify-center transition-all duration-200 overflow-hidden relative ${
                                    isActive ? "rounded-2xl shadow-glow ring-1 ring-white/20" : ""
                                }`}
                            >
                                {server.iconUrl ? (
                                    <img
                                        src={server.iconUrl}
                                        alt={server.name}
                                        className="w-full h-full object-cover bg-surface"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-[#22252F] flex items-center justify-center text-text-primary font-semibold text-body">
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

                <div className="relative group">
                    <button
                        onClick={onCreateServer}
                        className="w-12 h-12 rounded-[24px] hover:rounded-2xl bg-[#1D2029] hover:bg-success border border-[#2E3342] hover:border-success flex items-center justify-center transition-all duration-200"
                    >
                        <Plus className="w-5 h-5 text-success group-hover:text-white transition-colors" />
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface border border-border rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-lg">
                        Add a Server
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-surface border-l border-b border-border rotate-45" />
                    </div>
                </div>

                <div className="relative group">
                    <button
                        onClick={onJoinServer}
                        className="w-12 h-12 rounded-[24px] hover:rounded-2xl bg-[#1D2029] hover:bg-success border border-[#2E3342] hover:border-success flex items-center justify-center transition-all duration-200"
                    >
                        <Compass className="w-5 h-5 text-success group-hover:text-white transition-colors" />
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface border border-border rounded-lg text-micro text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-lg">
                        Join a Server
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-surface border-l border-b border-border rotate-45" />
                    </div>
                </div>
            </div>
        </div>
    );
}
