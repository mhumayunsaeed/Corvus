"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, Trash2, Shield, Crown, UserMinus, Search, Plus, Palette, GripVertical, Check } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import {
    updateServer,
    deleteServer,
    fetchMembers,
    updateMemberRole,
    kickMember,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    uploadImage,
    type MemberData,
    type RoleData,
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

type Tab = "Overview" | "Members" | "Roles";

// Permission constants (mirrored from backend)
const PERMISSIONS = {
    VIEW_CHANNEL:     1 << 0,
    SEND_MESSAGES:    1 << 1,
    MANAGE_MESSAGES:  1 << 2,
    MANAGE_CHANNELS:  1 << 3,
    MANAGE_ROLES:     1 << 4,
    MANAGE_SERVER:    1 << 5,
    CREATE_INVITES:   1 << 6,
    KICK_MEMBERS:     1 << 7,
    BAN_MEMBERS:      1 << 8,
    CONNECT_VOICE:    1 << 9,
    SPEAK:            1 << 10,
    STAGE_MODERATOR:  1 << 11,
    MANAGE_NICKNAMES: 1 << 12,
    MENTION_EVERYONE: 1 << 13,
    ATTACH_FILES:     1 << 14,
    USE_REACTIONS:    1 << 15,
} as const;

const PERMISSION_LABELS: Record<string, string> = {
    VIEW_CHANNEL: "View Channel",
    SEND_MESSAGES: "Send Messages",
    MANAGE_MESSAGES: "Manage Messages",
    MANAGE_CHANNELS: "Manage Channels",
    MANAGE_ROLES: "Manage Roles",
    MANAGE_SERVER: "Manage Server",
    CREATE_INVITES: "Create Invites",
    KICK_MEMBERS: "Kick Members",
    BAN_MEMBERS: "Ban Members",
    CONNECT_VOICE: "Connect to Voice",
    SPEAK: "Speak in Voice",
    STAGE_MODERATOR: "Stage Moderator",
    MANAGE_NICKNAMES: "Manage Nicknames",
    MENTION_EVERYONE: "Mention @everyone",
    ATTACH_FILES: "Attach Files",
    USE_REACTIONS: "Use Reactions",
};

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

    // Roles state
    const [roles, setRoles] = useState<RoleData[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [editRoleName, setEditRoleName] = useState("");
    const [editRoleColor, setEditRoleColor] = useState("");
    const [editRolePermissions, setEditRolePermissions] = useState(0);
    const [savingRole, setSavingRole] = useState(false);
    const [roleMessage, setRoleMessage] = useState<string | null>(null);
    const [creatingRole, setCreatingRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");

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

    // Load roles when tab switches
    useEffect(() => {
        if (open && activeTab === "Roles") {
            setLoadingRoles(true);
            fetchRoles(serverId)
                .then((res) => {
                    setRoles(res.roles);
                    if (res.roles.length > 0 && !selectedRoleId) {
                        setSelectedRoleId(res.roles[0].id);
                        setEditRoleName(res.roles[0].name);
                        setEditRoleColor(res.roles[0].color || "");
                        setEditRolePermissions(res.roles[0].permissions);
                    }
                })
                .catch(console.error)
                .finally(() => setLoadingRoles(false));
        }
    }, [open, activeTab, serverId]); // eslint-disable-line react-hooks/exhaustive-deps

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
                // Upload the resized icon to Supabase Storage and keep its URL.
                canvas.toBlob(
                    async (blob) => {
                        if (!blob) return;
                        try {
                            const url = await uploadImage(blob, "icon");
                            setIconPreview(url);
                        } catch (err) {
                            setSaveMessage(err instanceof Error ? err.message : "Failed to upload icon.");
                        }
                    },
                    "image/webp",
                    0.85
                );
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
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab("Roles")}
                                className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${
                                    activeTab === "Roles"
                                        ? "bg-surface-raised text-text-primary font-medium"
                                        : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                            >
                                Roles
                            </button>
                        )}
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
                                    className="px-6 py-2.5 bg-accent-violet text-white rounded-[10px] font-medium text-body transition-all hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed"
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

                    {activeTab === "Roles" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-text-primary">Roles</h2>
                                <button
                                    onClick={() => setCreatingRole(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-violet text-white rounded-lg text-body font-medium hover:bg-accent-violet/80 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Role
                                </button>
                            </div>

                            {/* Create role inline */}
                            {creatingRole && (
                                <div className="mb-4 p-4 bg-surface-raised rounded-xl border border-border">
                                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                                        Role Name
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newRoleName}
                                            onChange={(e) => setNewRoleName(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-body focus:outline-none focus:ring-2 focus:ring-accent-violet/50"
                                            placeholder="New role name..."
                                            autoFocus
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!newRoleName.trim()) return;
                                                try {
                                                    const res = await createRole(serverId, { name: newRoleName.trim() });
                                                    setRoles((prev) => [...prev, { ...res.role, memberCount: 0 }]);
                                                    setNewRoleName("");
                                                    setCreatingRole(false);
                                                    setSelectedRoleId(res.role.id);
                                                    setEditRoleName(res.role.name);
                                                    setEditRoleColor(res.role.color || "");
                                                    setEditRolePermissions(res.role.permissions);
                                                } catch (err) {
                                                    console.error("Failed to create role:", err);
                                                }
                                            }}
                                            className="px-4 py-2 bg-accent-violet text-white rounded-lg text-body font-medium hover:bg-accent-violet/80 transition-colors"
                                        >
                                            Create
                                        </button>
                                        <button
                                            onClick={() => { setCreatingRole(false); setNewRoleName(""); }}
                                            className="px-3 py-2 text-text-muted hover:text-text-primary transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {loadingRoles ? (
                                <div className="flex items-center justify-center py-12">
                                    <svg className="animate-spin w-6 h-6 text-accent-violet" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="flex gap-6">
                                    {/* Role list */}
                                    <div className="w-56 space-y-1 flex-shrink-0">
                                        {roles.map((role) => (
                                            <button
                                                key={role.id}
                                                onClick={() => {
                                                    setSelectedRoleId(role.id);
                                                    setEditRoleName(role.name);
                                                    setEditRoleColor(role.color || "");
                                                    setEditRolePermissions(role.permissions);
                                                    setRoleMessage(null);
                                                }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                                                    selectedRoleId === role.id
                                                        ? "bg-surface-raised text-text-primary"
                                                        : "text-text-muted hover:bg-hover-row hover:text-text-secondary"
                                                }`}
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: role.color || "#6b7280" }}
                                                />
                                                <span className="text-body truncate flex-1">{role.name}</span>
                                                <span className="text-micro text-text-muted">{role.memberCount}</span>
                                            </button>
                                        ))}
                                        {roles.length === 0 && (
                                            <p className="text-body text-text-muted px-3 py-4">
                                                No roles yet. Create one to get started.
                                            </p>
                                        )}
                                    </div>

                                    {/* Role editor */}
                                    {selectedRoleId && (() => {
                                        const selectedRole = roles.find((r) => r.id === selectedRoleId);
                                        if (!selectedRole) return null;

                                        return (
                                            <div className="flex-1 space-y-6">
                                                {/* Name */}
                                                <div>
                                                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                                                        Role Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editRoleName}
                                                        onChange={(e) => setEditRoleName(e.target.value)}
                                                        disabled={selectedRole.isDefault}
                                                        className="w-full px-4 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-body focus:outline-none focus:ring-2 focus:ring-accent-violet/50 transition-all disabled:opacity-50"
                                                    />
                                                </div>

                                                {/* Color */}
                                                <div>
                                                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                                                        Role Color
                                                    </label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            value={editRoleColor || "#6b7280"}
                                                            onChange={(e) => setEditRoleColor(e.target.value)}
                                                            className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editRoleColor}
                                                            onChange={(e) => setEditRoleColor(e.target.value)}
                                                            className="w-28 px-3 py-2 bg-surface-raised border border-border rounded-lg text-text-primary text-body font-mono focus:outline-none focus:ring-2 focus:ring-accent-violet/50"
                                                            placeholder="#000000"
                                                        />
                                                        {editRoleColor && (
                                                            <button
                                                                onClick={() => setEditRoleColor("")}
                                                                className="text-micro text-text-muted hover:text-text-primary"
                                                            >
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Permissions */}
                                                <div>
                                                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-3">
                                                        Permissions
                                                    </label>
                                                    <div className="space-y-2">
                                                        {Object.entries(PERMISSIONS).map(([key, bit]) => {
                                                            const isEnabled = (editRolePermissions & bit) === bit;
                                                            return (
                                                                <label
                                                                    key={key}
                                                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-hover-row transition-colors cursor-pointer"
                                                                    onClick={() => {
                                                                        setEditRolePermissions((prev) =>
                                                                            isEnabled ? prev & ~bit : prev | bit
                                                                        );
                                                                    }}
                                                                >
                                                                    <span className="text-body text-text-primary">
                                                                        {PERMISSION_LABELS[key] || key}
                                                                    </span>
                                                                    <div
                                                                        role="switch"
                                                                        aria-checked={isEnabled}
                                                                        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                                                                            isEnabled ? "bg-accent-violet" : "bg-surface-raised"
                                                                        }`}
                                                                    >
                                                                        <div
                                                                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                                                                isEnabled ? "translate-x-5" : "translate-x-0"
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Save / Delete */}
                                                <div className="flex items-center gap-3 pt-4 border-t border-border">
                                                    <button
                                                        onClick={async () => {
                                                            setSavingRole(true);
                                                            setRoleMessage(null);
                                                            try {
                                                                await updateRole(selectedRoleId, {
                                                                    name: editRoleName.trim() || selectedRole.name,
                                                                    color: editRoleColor || null,
                                                                    permissions: editRolePermissions,
                                                                });
                                                                setRoles((prev) =>
                                                                    prev.map((r) =>
                                                                        r.id === selectedRoleId
                                                                            ? { ...r, name: editRoleName.trim() || r.name, color: editRoleColor || null, permissions: editRolePermissions }
                                                                            : r
                                                                    )
                                                                );
                                                                setRoleMessage("Saved!");
                                                                setTimeout(() => setRoleMessage(null), 2000);
                                                            } catch (err) {
                                                                setRoleMessage(err instanceof Error ? err.message : "Failed to save.");
                                                            } finally {
                                                                setSavingRole(false);
                                                            }
                                                        }}
                                                        disabled={savingRole}
                                                        className="px-5 py-2 bg-accent-violet text-white rounded-lg font-medium text-body hover:bg-accent-violet/80 transition-colors disabled:opacity-50"
                                                    >
                                                        {savingRole ? "Saving..." : "Save Changes"}
                                                    </button>

                                                    {!selectedRole.isDefault && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!window.confirm(`Delete the "${selectedRole.name}" role?`)) return;
                                                                try {
                                                                    await deleteRole(selectedRoleId);
                                                                    setRoles((prev) => prev.filter((r) => r.id !== selectedRoleId));
                                                                    setSelectedRoleId(roles[0]?.id !== selectedRoleId ? roles[0]?.id ?? null : roles[1]?.id ?? null);
                                                                } catch (err) {
                                                                    console.error("Failed to delete role:", err);
                                                                }
                                                            }}
                                                            className="px-4 py-2 text-danger hover:bg-danger/10 rounded-lg text-body transition-colors"
                                                        >
                                                            Delete Role
                                                        </button>
                                                    )}

                                                    {roleMessage && (
                                                        <span className={`text-micro ${roleMessage === "Saved!" ? "text-success" : "text-danger"}`}>
                                                            {roleMessage}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
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
