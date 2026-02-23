"use client";

import { useState } from "react";
import { Modal } from "@corvus/ui";
import { X, Loader2 } from "lucide-react";
import { createServer } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

interface CreateServerModalProps {
    open: boolean;
    onClose: () => void;
}

export function CreateServerModal({ open, onClose }: CreateServerModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const addServer = useAppStore((s) => s.addServer);
    const setActiveServer = useAppStore((s) => s.setActiveServer);
    const setChannels = useAppStore((s) => s.setChannels);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError("");

        try {
            const result = await createServer({
                name: name.trim(),
                description: description.trim() || undefined,
            });

            const server = result.server;
            addServer({
                id: server.id,
                name: server.name,
                iconUrl: server.iconUrl ?? null,
                description: server.description ?? null,
                ownerId: server.ownerId,
                memberCount: server.memberCount ?? 1,
                role: server.role ?? "owner",
            });
            setActiveServer(server.id);
            setChannels(server.channels);

            // Reset and close
            setName("");
            setDescription("");
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} className="w-[440px]">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-heading font-bold text-text-primary">
                        Create a Server
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-body text-text-muted mb-6">
                    Give your server a name and start building your community.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-micro font-semibold text-text-muted uppercase tracking-wider mb-2">
                            Server Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My awesome server"
                            className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/20 transition-all text-[14px]"
                            maxLength={100}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-micro font-semibold text-text-muted uppercase tracking-wider mb-2">
                            Description
                            <span className="text-text-muted font-normal ml-1">(optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's your server about?"
                            className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/20 transition-all text-[14px] resize-none h-20"
                            maxLength={500}
                        />
                    </div>

                    {error && (
                        <p className="text-body text-danger">{error}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-body text-text-muted hover:text-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || loading}
                            className="px-6 py-2 bg-accent-violet text-white rounded-[10px] font-medium text-body hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Server
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
