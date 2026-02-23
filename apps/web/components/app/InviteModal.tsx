"use client";

import { useState } from "react";
import { Modal } from "@corvus/ui";
import { X, Loader2, Copy, Check, Link } from "lucide-react";
import { createInvite, joinInvite } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { fetchServers } from "@/lib/api";

interface InviteModalProps {
    open: boolean;
    onClose: () => void;
    mode: "create" | "join";
    serverId?: string;
    serverName?: string;
}

export function InviteModal({ open, onClose, mode, serverId, serverName }: InviteModalProps) {
    const [inviteCode, setInviteCode] = useState("");
    const [generatedCode, setGeneratedCode] = useState("");
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const setServers = useAppStore((s) => s.setServers);
    const setActiveServer = useAppStore((s) => s.setActiveServer);

    const handleCreateInvite = async () => {
        if (!serverId) return;
        setLoading(true);
        setError("");

        try {
            const result = await createInvite(serverId);
            setGeneratedCode(result.invite.code);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create invite.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        const link = `${window.location.origin}/invite/${generatedCode}`;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            // Extract code from full URL or use raw code
            let code = inviteCode.trim();
            const match = code.match(/\/invite\/([A-Za-z0-9]+)/);
            if (match) code = match[1];

            const result = await joinInvite(code);
            setSuccess(`Joined ${result.server.name}!`);

            // Refresh servers
            const servers = await fetchServers();
            setServers(servers.servers);
            setActiveServer(result.server.id);

            setTimeout(() => {
                setInviteCode("");
                setSuccess("");
                onClose();
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to join server.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setInviteCode("");
        setGeneratedCode("");
        setCopied(false);
        setError("");
        setSuccess("");
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} className="w-[440px]">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-heading font-bold text-text-primary">
                        {mode === "create" ? "Invite People" : "Join a Server"}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {mode === "create" ? (
                    <div className="space-y-4">
                        <p className="text-body text-text-muted">
                            Share this invite link with others to grant access to{" "}
                            <span className="text-text-primary font-medium">{serverName}</span>.
                        </p>

                        {!generatedCode ? (
                            <button
                                onClick={handleCreateInvite}
                                disabled={loading}
                                className="w-full px-4 py-3 bg-accent-violet text-white rounded-[10px] font-medium text-body hover:bg-accent-violet/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Link className="w-4 h-4" />
                                )}
                                Generate Invite Link
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 px-3.5 py-2.5 bg-surface-raised border border-border rounded-[10px] text-body text-accent-teal font-mono truncate">
                                        {window.location.origin}/invite/{generatedCode}
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        className={`px-4 py-2.5 rounded-[10px] font-medium text-body transition-all flex items-center gap-1.5 ${
                                            copied
                                                ? "bg-success text-white"
                                                : "bg-accent-violet text-white hover:bg-accent-violet/90"
                                        }`}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-micro text-text-muted">
                                    This invite link does not expire.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleJoin} className="space-y-4">
                        <p className="text-body text-text-muted">
                            Enter an invite link or code to join an existing server.
                        </p>

                        <div>
                            <label className="block text-micro font-semibold text-text-muted uppercase tracking-wider mb-2">
                                Invite Link or Code
                            </label>
                            <input
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                placeholder="https://corvus.app/invite/abc123 or abc123"
                                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/20 transition-all text-[14px]"
                                autoFocus
                            />
                        </div>

                        {error && <p className="text-body text-danger">{error}</p>}
                        {success && <p className="text-body text-success">{success}</p>}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-body text-text-muted hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!inviteCode.trim() || loading}
                                className="px-6 py-2 bg-accent-violet text-white rounded-[10px] font-medium text-body hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Join Server
                            </button>
                        </div>
                    </form>
                )}

                {error && mode === "create" && <p className="text-body text-danger mt-3">{error}</p>}
            </div>
        </Modal>
    );
}
