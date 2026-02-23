"use client";

import { useState } from "react";
import { Modal } from "@corvus/ui";
import { X, Loader2, Hash, Volume2, Megaphone } from "lucide-react";
import { createChannel } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

interface CreateChannelModalProps {
    open: boolean;
    onClose: () => void;
    serverId: string;
    existingCategories: string[];
}

const channelTypes = [
    { value: "text", label: "Text", icon: Hash, description: "Send messages, images, and files" },
    { value: "voice", label: "Voice", icon: Volume2, description: "Hang out with voice and video" },
    { value: "announcement", label: "Announcement", icon: Megaphone, description: "Important updates for members" },
] as const;

export function CreateChannelModal({ open, onClose, serverId, existingCategories }: CreateChannelModalProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<string>("text");
    const [category, setCategory] = useState(existingCategories[0] || "General");
    const [customCategory, setCustomCategory] = useState("");
    const [useCustomCategory, setUseCustomCategory] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const addChannel = useAppStore((s) => s.addChannel);

    // Auto-format channel name (lowercase, hyphens for spaces)
    const formatName = (input: string) => {
        return input
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const channelName = formatName(name);
        if (!channelName) return;

        setLoading(true);
        setError("");

        try {
            const result = await createChannel(serverId, {
                name: channelName,
                type,
                category: useCustomCategory ? customCategory.trim() || "General" : category,
            });

            addChannel(result.channel);

            // Reset and close
            setName("");
            setType("text");
            setCategory(existingCategories[0] || "General");
            setCustomCategory("");
            setUseCustomCategory(false);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create channel.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} className="w-[440px]">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-heading font-bold text-text-primary">
                        Create Channel
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Channel Type */}
                    <div>
                        <label className="block text-micro font-semibold text-text-muted uppercase tracking-wider mb-2">
                            Channel Type
                        </label>
                        <div className="space-y-1.5">
                            {channelTypes.map((ct) => (
                                <button
                                    key={ct.value}
                                    type="button"
                                    onClick={() => setType(ct.value)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                                        type === ct.value
                                            ? "border-accent-violet bg-accent-violet/10"
                                            : "border-border bg-surface-raised hover:bg-hover-row"
                                    }`}
                                >
                                    <ct.icon className={`w-5 h-5 ${type === ct.value ? "text-accent-violet" : "text-text-muted"}`} />
                                    <div className="text-left">
                                        <div className="text-body font-medium text-text-primary">{ct.label}</div>
                                        <div className="text-micro text-text-muted">{ct.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Channel Name */}
                    <div>
                        <label className="block text-micro font-semibold text-text-muted uppercase tracking-wider mb-2">
                            Channel Name
                        </label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="new-channel"
                                className="w-full pl-9 pr-3.5 py-2.5 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/20 transition-all text-[14px]"
                                maxLength={50}
                                autoFocus
                            />
                        </div>
                        {name && (
                            <p className="text-micro text-text-muted mt-1">
                                Will be created as <span className="text-accent-teal">#{formatName(name)}</span>
                            </p>
                        )}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-micro font-semibold text-text-muted uppercase tracking-wider mb-2">
                            Category
                        </label>
                        {!useCustomCategory ? (
                            <div className="flex gap-2">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="flex-1 px-3.5 py-2.5 bg-surface-raised border border-border rounded-[10px] text-text-primary outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/20 transition-all text-[14px]"
                                >
                                    {existingCategories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setUseCustomCategory(true)}
                                    className="px-3 py-2.5 text-micro text-accent-violet hover:text-accent-violet/80 transition-colors whitespace-nowrap"
                                >
                                    + New
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                    placeholder="New category name"
                                    className="flex-1 px-3.5 py-2.5 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/20 transition-all text-[14px]"
                                    maxLength={50}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUseCustomCategory(false);
                                        setCustomCategory("");
                                    }}
                                    className="px-3 py-2.5 text-micro text-text-muted hover:text-text-primary transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
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
                            disabled={!formatName(name) || loading}
                            className="px-6 py-2 bg-accent-violet text-white rounded-[10px] font-medium text-body hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Channel
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
