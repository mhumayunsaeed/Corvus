"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@corvus/ui";
import {
    Check,
    ChevronLeft,
    Hash,
    ImagePlus,
    Loader2,
    Megaphone,
    Upload,
    Users,
    Volume2,
    X,
    type LucideIcon,
} from "lucide-react";
import { uploadImage } from "@/lib/api";
import { notifySuccess } from "@/lib/notify";
import { validateAttachmentFile } from "@/lib/attachments";
import { ensureApiUrl } from "@/lib/endpoints";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";

interface CreateServerModalProps {
    open: boolean;
    onClose: () => void;
}

type TemplateChannelType = "text" | "voice" | "announcement" | "forum" | "stage";

interface ServerTemplateChannel {
    name: string;
    type: TemplateChannelType;
    category: string;
}

interface ServerTemplate {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    channels: ServerTemplateChannel[];
}

const SERVER_TEMPLATES: ServerTemplate[] = [
    {
        id: "community",
        name: "Community Starter",
        description: "Balanced setup for clubs, fandoms, and social groups.",
        icon: Users,
        channels: [
            { name: "general", type: "text", category: "General" },
            { name: "introductions", type: "text", category: "General" },
            { name: "voice-lounge", type: "voice", category: "General" },
            { name: "announcements", type: "announcement", category: "Info" },
        ],
    },
    {
        id: "gaming",
        name: "Gaming Squad",
        description: "Queues, clips, and voice rooms for active game nights.",
        icon: Volume2,
        channels: [
            { name: "lfg", type: "text", category: "Matchmaking" },
            { name: "clips", type: "text", category: "Media" },
            { name: "party-chat", type: "voice", category: "Voice" },
            { name: "strategy", type: "text", category: "Voice" },
        ],
    },
    {
        id: "study",
        name: "Study Hub",
        description: "Focused channels for planning, sharing resources, and sessions.",
        icon: Hash,
        channels: [
            { name: "study-chat", type: "text", category: "Study" },
            { name: "resources", type: "text", category: "Study" },
            { name: "sessions", type: "voice", category: "Study" },
            { name: "updates", type: "announcement", category: "Info" },
        ],
    },
    {
        id: "blank",
        name: "Blank Server",
        description: "Start from scratch with only a default #general channel.",
        icon: Megaphone,
        channels: [],
    },
];

export function CreateServerModal({ open, onClose }: CreateServerModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(SERVER_TEMPLATES[0].id);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [iconUrl, setIconUrl] = useState<string | null>(null);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addServer = useAppStore((s) => s.addServer);
    const setActiveServer = useAppStore((s) => s.setActiveServer);
    const setChannels = useAppStore((s) => s.setChannels);
    const token = useAuthStore((s) => s.token);

    const selectedTemplate = useMemo(
        () =>
            SERVER_TEMPLATES.find((template) => template.id === selectedTemplateId) ||
            SERVER_TEMPLATES[0],
        [selectedTemplateId]
    );

    const resetState = () => {
        setStep(1);
        setSelectedTemplateId(SERVER_TEMPLATES[0].id);
        setName("");
        setDescription("");
        setIconUrl(null);
        setUploadingIcon(false);
        setLoading(false);
        setError("");
    };

    const handleClose = () => {
        if (loading || uploadingIcon) return;
        resetState();
        onClose();
    };

    useEffect(() => {
        if (!open) {
            resetState();
        }
    }, [open]);

    const handleIconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        const validationError = validateAttachmentFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!file.type.startsWith("image/")) {
            setError("Server icon must be an image.");
            return;
        }

        setUploadingIcon(true);
        setError("");
        try {
            const url = await uploadImage(file, "icon");
            setIconUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to upload server icon.");
        } finally {
            setUploadingIcon(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            setStep(2);
            return;
        }
        if (!name.trim()) return;

        setLoading(true);
        setError("");

        const payload = {
            name: name.trim(),
            description: description.trim() || undefined,
            iconUrl: iconUrl || undefined,
            channels: selectedTemplate.channels.length > 0 ? selectedTemplate.channels : undefined,
        };

        try {
            const baseUrl = ensureApiUrl();

            const res = await fetch(`${baseUrl}/servers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                const msg = data?.error || data?.message || `Server returned ${res.status}`;
                throw new Error(msg);
            }

            if (!data?.server) {
                throw new Error("Invalid response from server.");
            }

            const server = data.server;

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
            if (server.channels) {
                setChannels(server.channels);
            }
            notifySuccess(`${server.name} is ready.`, "Space created");

            resetState();
            onClose();
        } catch (err) {
            console.error("[CreateServer] Error:", err);
            setError(err instanceof Error ? err.message : "Failed to create server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={handleClose} className="w-[min(92vw,720px)]">
            <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-heading font-bold text-text-primary">Create a Server</h2>
                    <button
                        onClick={handleClose}
                        disabled={loading || uploadingIcon}
                        className="w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div
                        className={`h-1.5 flex-1 rounded-full ${
                            step >= 1 ? "bg-accent-violet" : "bg-border"
                        }`}
                    />
                    <div
                        className={`h-1.5 flex-1 rounded-full ${
                            step >= 2 ? "bg-accent-violet" : "bg-border"
                        }`}
                    />
                </div>
                <div className="flex items-center justify-between text-micro text-text-muted">
                    <span>1. Choose template</span>
                    <span>2. Customize details</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {step === 1 ? (
                        <div className="grid gap-2.5 md:grid-cols-2">
                            {SERVER_TEMPLATES.map((template) => {
                                const isSelected = template.id === selectedTemplate.id;
                                return (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => setSelectedTemplateId(template.id)}
                                        className={`rounded-xl border p-3 text-left transition-all ${
                                            isSelected
                                                ? "border-accent-violet bg-accent-violet/10"
                                                : "border-border bg-surface-raised hover:bg-hover-row"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                                    isSelected
                                                        ? "bg-accent-violet/20 text-accent-violet"
                                                        : "bg-surface text-text-muted"
                                                }`}
                                            >
                                                <template.icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-body font-semibold text-text-primary">
                                                        {template.name}
                                                    </p>
                                                    {isSelected && (
                                                        <Check className="w-4 h-4 text-accent-violet" />
                                                    )}
                                                </div>
                                                <p className="text-micro text-text-muted mt-0.5">
                                                    {template.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-micro text-text-muted">
                                            {template.channels.length > 0
                                                ? `${template.channels.length} starter channels`
                                                : "Only #general will be created"}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border bg-surface-raised p-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden">
                                        {iconUrl ? (
                                            <img
                                                src={iconUrl}
                                                alt="Server icon preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ImagePlus className="w-5 h-5 text-text-muted" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-body font-semibold text-text-primary">
                                            Server Icon
                                        </p>
                                        <p className="text-micro text-text-muted mt-0.5">
                                            PNG, JPG, or WEBP. Recommended 512x512.
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={uploadingIcon || loading}
                                                onClick={() => fileInputRef.current?.click()}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-body text-text-primary hover:bg-hover-row transition-colors disabled:opacity-60"
                                            >
                                                {uploadingIcon ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Upload className="w-4 h-4" />
                                                )}
                                                {iconUrl ? "Replace Icon" : "Upload Icon"}
                                            </button>
                                            {iconUrl && (
                                                <button
                                                    type="button"
                                                    disabled={uploadingIcon || loading}
                                                    onClick={() => setIconUrl(null)}
                                                    className="px-3 py-1.5 rounded-lg text-body text-text-muted hover:text-text-primary hover:bg-hover-row transition-colors disabled:opacity-60"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleIconSelect}
                                        />
                                    </div>
                                </div>
                            </div>

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
                                    placeholder="What is your server about?"
                                    className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-[10px] text-text-primary placeholder-text-muted outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/20 transition-all text-[14px] resize-none h-20"
                                    maxLength={500}
                                />
                            </div>

                            <div className="rounded-xl border border-border bg-surface-raised p-3">
                                <p className="text-micro font-semibold uppercase tracking-wider text-text-muted mb-2">
                                    Template Preview: {selectedTemplate.name}
                                </p>
                                {selectedTemplate.channels.length === 0 ? (
                                    <p className="text-body text-text-muted">
                                        A default <span className="text-text-primary">#general</span> channel
                                        will be created.
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {selectedTemplate.channels.map((channel) => (
                                            <div
                                                key={`${channel.category}-${channel.name}`}
                                                className="flex items-center justify-between text-body"
                                            >
                                                <span className="text-text-primary">#{channel.name}</span>
                                                <span className="text-text-muted">{channel.category}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="text-body text-danger">{error}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading || uploadingIcon}
                            className="px-4 py-2 text-body text-text-muted hover:text-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        {step === 2 && (
                            <button
                                type="button"
                                disabled={loading || uploadingIcon}
                                onClick={() => setStep(1)}
                                className="px-4 py-2 rounded-[10px] border border-border text-body text-text-primary hover:bg-hover-row transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}
                        {step === 1 ? (
                            <button
                                type="submit"
                                className="px-6 py-2 bg-accent-violet text-white rounded-[10px] font-medium text-body hover:bg-accent-violet/90 transition-all"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!name.trim() || loading || uploadingIcon}
                                className="px-6 py-2 bg-accent-violet text-white rounded-[10px] font-medium text-body hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Create Server
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
}
