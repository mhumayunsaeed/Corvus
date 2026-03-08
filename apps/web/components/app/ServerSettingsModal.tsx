"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, Trash2, Shield, Crown, UserMinus, Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import {
    updateServer,
    deleteServer,
    fetchMembers,
    updateMemberRole,
    kickMember,
    type MemberData,
} from "@/lib/api";
import { UserAvatar } from "./UserAvatar";

interface ServerSettingsModalProps {
    open: boolean;
    onClose: () => void;
    serverId: string;
    serverName: string;
    serverIconUrl: string | null;
    serverDescription: string | null;
    serverOwnerId: string;
    serverRole: string;
}

type Tab = "Overview" | "Members";

export function ServerSettingsModal({
    open,
    onClose,
    serverId,
    serverName,
    serverIconUrl,
    serverDescription,
    serverOwnerId,
    serverRole,
}: ServerSettingsModalProps) {
    const user = useAuthStore((s) => s.user);
    const removeServer = useAppStore((s) => s.removeServer);
    const updateServerInStore = useAppStore((s) => s.updateServer);

    const [activeTab, setActiveTab] = useState<Tab>("Overview");

    // Overview state
    const [name, setName] = useState(serverName);
    const [description, setDescription] = useState(serverDescription || "");
    const [iconPreview, setIconPreview] = useState<string | null>(serverIconUrl);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const iconInputRef = useRef<HTMLInputElement>(null);

    // Members state
    const [members, setMembers] = useState<MemberData[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");
    const [changingRole, setChangingRole] = useState<Record<string, boolean>>({});

    // Sync props when modal opens or server changes
    useEffect(() => {
        if (open) {
            setName(serverName);
            setDescription(serverDescription || "");
            setIconPreview(serverIconUrl);
            setSaveMessage(null);
            setShowDeleteConfirm(false);
            setActiveTab("Overview");
        }
    }, [open, serverName, serverDescription, serverIconUrl]);

    // Load members when tab switches
    useEffect(() => {
        if (open && activeTab === "Members" && members.length === 0) {
            setLoadingMembers(true);
            fetchMembers(serverId)
                .then((res) => setMembers(res.members))
                .catch(console.error)
                .finally(() => setLoadingMembers(false));
        }
    }, [open, activeTab, serverId, members.length]);

    if (!open) return null;

    const isOwner = user?.id === serverOwnerId;
    const isAdmin = serverRole === "admin" || isOwner;

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) return;
        if (file.size > 5 * 1024 * 1024) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxSize = 256;
                let w = img.width;
                let h = img.height;
                if (w > maxSize || h > maxSize) {
                    if (w > h) {
                        h = Math.round((h * maxSize) / w);
                        w = maxSize;
                    } else {
                        w = Math.round((w * maxSize) / h);
                        h = maxSize;
                    }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
                setIconPreview(canvas.toDataURL("image/webp", 0.85));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage(null);
        try {
            await updateServer(serverId, {
                name: name.trim() || serverName,
                description: description.trim() || null,
                iconUrl: iconPreview,
            });
            updateServerInStore(serverId, {
                name: name.trim() || serverName,
                description: description.trim() || null,
                iconUrl: iconPreview,
            });
            setSaveMessage("Changes saved!");
            setTimeout(() => setSaveMessage(null), 2000);
        } catch (err) {
            setSaveMessage(err instanceof Error ? err.message : "Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteServer(serverId);
            removeServer(serverId);
            onClose();
        } catch (err) {
            console.error("Failed to delete server:", err);
            setDeleting(false);
        }
    };

    const handleRoleChange = async (member: MemberData, newRole: string) => {
        setChangingRole((prev) => ({ ...prev, [member.userId]: true }));
        try {
            await updateMemberRole(serverId, member.userId, newRole);
            setMembers((prev) =>
                prev.map((m) =>
                    m.userId === member.userId ? { ...m, role: newRole } : m
                )
            );
        } catch (err) {
            console.error("Failed to change role:", err);
        } finally {
            setChangingRole((prev) => ({ ...prev, [member.userId]: false }));
        }
    };

    const handleKick = async (member: MemberData) => {
        if (!window.confirm(`Kick ${member.user.displayName} from the server?`)) return;
        try {
            await kickMember(serverId, member.userId);
            setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
        } catch (err) {
            console.error("Failed to kick member:", err);
        }
    };

    const filteredMembers = members.filter(
        (m) =>
            m.user.displayName.toLowerCase().includes(memberSearch.toLowerCase()) ||
            m.user.username.toLowerCase().includes(memberSearch.toLowerCase())
    );

    const hasChanges =
        name.trim() !== serverName ||
        (description.trim() || "") !== (serverDescription || "") ||
        iconPreview !== serverIconUrl;

    return (
        <div className="fixed inset-0 z-[100] flex bg-background">
            <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIconChange}
            />

            {/* Sidebar */}
            <div className="w-[30%] max-w-[280px] min-w-[218px] bg-surface flex justify-end">
                <div className="w-full max-w-[218px] py-14 pr-4 pl-4 space-y-5">
                    <div>
                        <div className="px-2 pb-1.5 text-xs font-bold text-text-muted uppercase tracking-wider truncate">
                            {serverName}
                        </div>
                        <button
                            onClick={() => setActiveTab("Overview")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${
                                activeTab === "Overview"
                                    ? "bg-surface-raised text-text-primary font-medium"
                                    : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab("Members")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${
                                activeTab === "Members"
                                    ? "bg-surface-raised text-text-primary font-medium"
                                    : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                            }`}
                        >
                            Members
                        </button>
                    </div>

                    {isOwner && (
                        <>
                            <div className="w-full h-[1px] bg-border px-2" />
                            <div>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md transition-colors text-body text-danger hover:bg-danger/10"
                                >
                                    Delete Server
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-background relative overflow-y-auto pt-14 px-10 pb-20">
                <div className="max-w-[740px]">
                    {activeTab === "Overview" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Server Overview</h2>

                            {/* Icon */}
                            <div className="flex items-center gap-5 mb-8">
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => iconInputRef.current?.click()}
                                >
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-raised border border-border flex items-center justify-center">
                                        {iconPreview ? (
                                            <img
                                                src={iconPreview}
                                                alt={name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-2xl font-bold text-text-muted">
                                                {name
                                                    .split(" ")
                                                    .map((w) => w[0])
                                                    .join("")
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Upload className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-body text-text-primary font-medium">Server Icon</p>
                                    <p className="text-micro text-text-muted">
                                        Click to upload. Recommended 256x256.
                                    </p>
                                    {iconPreview && (
                                        <button
                                            onClick={() => setIconPreview(null)}
                                            className="text-micro text-danger hover:underline mt-1"
                                        >
                                            Remove icon
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Name */}
                            <div className="mb-5">
                                <label className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                    Server Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary text-body focus:outline-none focus:ring-2 focus:ring-accent-violet/50 transition-all"
                                    maxLength={50}
                                />
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <label className="block text-micro font-medium mb-2 text-text-muted uppercase tracking-wider">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-raised border border-border rounded-[10px] text-text-primary text-body focus:outline-none focus:ring-2 focus:ring-accent-violet/50 transition-all resize-none h-24"
                                    maxLength={500}
                                    placeholder="What's your server about?"
                                />
                            </div>

                            {/* Save */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !hasChanges}
                                    className="px-6 py-2.5 bg-accent-violet text-white rounded-[10px] font-medium text-body transition-all hover:bg-[#6B59E6] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                                {saveMessage && (
                                    <span className={`text-micro ${saveMessage.includes("saved") ? "text-success" : "text-danger"}`}>
                                        {saveMessage}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "Members" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-text-primary">
                                    Members{members.length > 0 ? ` (${members.length})` : ""}
                                </h2>
                            </div>

                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface-raised border border-border rounded-[10px] text-text-primary text-body focus:outline-none focus:ring-2 focus:ring-accent-violet/50 transition-all"
                                    placeholder="Search members..."
                                />
                            </div>

                            {loadingMembers ? (
                                <div className="flex items-center justify-center py-12">
                                    <svg className="animate-spin w-6 h-6 text-accent-violet" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredMembers.map((member) => {
                                        const isMemberOwner = member.userId === serverOwnerId;
                                        const canManage =
                                            isAdmin &&
                                            !isMemberOwner &&
                                            member.userId !== user?.id;

                                        return (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-hover-row transition-colors group"
                                            >
                                                <UserAvatar
                                                    avatarUrl={member.user.avatarUrl}
                                                    username={member.user.username}
                                                    className="w-9 h-9"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-body text-text-primary font-medium truncate">
                                                            {member.user.displayName}
                                                        </span>
                                                        {isMemberOwner && (
                                                            <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                                                        )}
                                                        {member.role === "admin" && !isMemberOwner && (
                                                            <Shield className="w-3.5 h-3.5 text-accent-violet flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <span className="text-micro text-text-muted">
                                                        @{member.user.username}
                                                    </span>
                                                </div>

                                                {/* Role badge */}
                                                <span className={`text-micro px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                    isMemberOwner
                                                        ? "bg-yellow-500/10 text-yellow-500"
                                                        : member.role === "admin"
                                                            ? "bg-accent-violet/10 text-accent-violet"
                                                            : "bg-surface-raised text-text-muted"
                                                }`}>
                                                    {isMemberOwner ? "Owner" : member.role === "admin" ? "Admin" : "Member"}
                                                </span>

                                                {/* Actions */}
                                                {canManage && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() =>
                                                                handleRoleChange(
                                                                    member,
                                                                    member.role === "admin" ? "member" : "admin"
                                                                )
                                                            }
                                                            disabled={changingRole[member.userId]}
                                                            className="p-1.5 rounded-md hover:bg-surface-raised text-text-muted hover:text-accent-violet transition-colors"
                                                            title={
                                                                member.role === "admin"
                                                                    ? "Demote to member"
                                                                    : "Promote to admin"
                                                            }
                                                        >
                                                            <Shield className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleKick(member)}
                                                            className="p-1.5 rounded-md hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                                                            title="Kick member"
                                                        >
                                                            <UserMinus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {filteredMembers.length === 0 && !loadingMembers && (
                                        <p className="text-center text-text-muted text-body py-8">
                                            {memberSearch ? "No members found." : "No members."}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full border border-border text-text-muted hover:text-text-primary hover:bg-hover-row transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Delete confirmation overlay */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
                    <div className="bg-surface rounded-2xl p-6 max-w-md w-full mx-4 border border-border shadow-2xl">
                        <h3 className="text-lg font-bold text-text-primary mb-2">
                            Delete &ldquo;{serverName}&rdquo;?
                        </h3>
                        <p className="text-body text-text-muted mb-6">
                            This action is permanent. All channels, messages, and member data will be lost.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 rounded-[10px] text-body text-text-primary hover:bg-hover-row transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-4 py-2 rounded-[10px] text-body bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-50"
                            >
                                {deleting ? "Deleting..." : "Delete Server"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
