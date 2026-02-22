"use client";

import { useState, useEffect } from "react";
import { X, LogOut, Pencil } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

interface UserSettingsModalProps {
    open: boolean;
    onClose: () => void;
}

type Tab = "My Account" | "Profiles" | "Appearance" | "Voice & Video";

export function UserSettingsModal({ open, onClose }: UserSettingsModalProps) {
    const { user, logout, updateUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>("My Account");
    const [theme, setTheme] = useState<"light" | "dark">("dark");

    // Form states
    const [displayName, setDisplayName] = useState("");
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioInputId, setAudioInputId] = useState("default");
    const [audioOutputId, setAudioOutputId] = useState("default");
    const [pushToTalk, setPushToTalk] = useState(false);

    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

    // Initial load
    useEffect(() => {
        if (open) {
            setDisplayName(user?.displayName || "");

            // Check current theme 
            if (typeof document !== "undefined") {
                const isDark = document.documentElement.classList.contains("dark");
                setTheme(isDark ? "dark" : "light");
            }

            // Sync media devices
            if (navigator?.mediaDevices?.enumerateDevices) {
                navigator.mediaDevices.enumerateDevices().then(setDevices).catch(console.error);
            }
        }
    }, [open, user?.displayName]);

    if (!open) return null;

    const avatarUrl = user?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user?.username || "user"}`;

    const handleLogout = () => {
        onClose();
        logout();
        window.location.href = "/login";
    };

    const handleUpdateProfile = () => {
        if (displayName && displayName !== user?.displayName) {
            updateUser({ displayName });
        }
    };

    const handleChangeAvatar = () => {
        const newUrl = window.prompt("Enter new avatar URL:");
        if (newUrl) {
            updateUser({ avatar: newUrl });
        }
    };

    const handleRemoveAvatar = () => {
        if (window.confirm("Are you sure you want to remove your avatar?")) {
            updateUser({ avatar: null });
        }
    };

    const handleThemeChange = (newTheme: "light" | "dark") => {
        setTheme(newTheme);
        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const audioInputs = devices.filter(d => d.kind === "audioinput");
    const audioOutputs = devices.filter(d => d.kind === "audiooutput");

    return (
        <div className="fixed inset-0 z-[100] flex bg-background">
            {/* Sidebar */}
            <div className="w-[30%] max-w-[280px] min-w-[218px] bg-surface flex justify-end">
                <div className="w-full max-w-[218px] py-14 pr-4 pl-4 space-y-5">
                    <div>
                        <div className="px-2 pb-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">
                            User Settings
                        </div>
                        <button
                            onClick={() => setActiveTab("My Account")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${activeTab === "My Account"
                                    ? "bg-surface-raised text-text-primary font-medium"
                                    : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                        >
                            My Account
                        </button>
                        <button
                            onClick={() => setActiveTab("Profiles")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${activeTab === "Profiles"
                                    ? "bg-surface-raised text-text-primary font-medium"
                                    : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                        >
                            Profiles
                        </button>
                    </div>

                    <div className="w-full h-[1px] bg-border px-2" />

                    <div>
                        <div className="px-2 pb-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">
                            App Settings
                        </div>
                        <button
                            onClick={() => setActiveTab("Appearance")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${activeTab === "Appearance"
                                    ? "bg-surface-raised text-text-primary font-medium"
                                    : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                        >
                            Appearance
                        </button>
                        <button
                            onClick={() => setActiveTab("Voice & Video")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${activeTab === "Voice & Video"
                                    ? "bg-surface-raised text-text-primary font-medium"
                                    : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                        >
                            Voice & Video
                        </button>
                    </div>

                    <div className="w-full h-[1px] bg-border px-2" />

                    <div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md transition-colors text-body text-danger hover:bg-danger/10"
                        >
                            Log Out
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 bg-background relative overflow-y-auto pt-14 px-10 pb-20">
                <div className="max-w-[740px]">
                    {activeTab === "My Account" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">My Account</h2>

                            {/* Profile Banner / Card */}
                            <div className="bg-surface border border-border rounded-xl mt-6 overflow-hidden">
                                <div className="h-24 bg-accent-violet/30" />
                                <div className="px-5 pb-6">
                                    <div className="flex justify-between items-start -mt-10 mb-4">
                                        <div
                                            className="relative rounded-full border-[6px] border-surface cursor-pointer ring-0"
                                            onMouseEnter={() => setIsHoveringAvatar(true)}
                                            onMouseLeave={() => setIsHoveringAvatar(false)}
                                            onClick={handleChangeAvatar}
                                        >
                                            <img
                                                src={avatarUrl}
                                                alt="Avatar"
                                                className="w-20 h-20 rounded-full bg-surface-raised"
                                            />
                                            {isHoveringAvatar && (
                                                <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center animate-in fade-in duration-100">
                                                    <Pencil className="w-5 h-5 text-white mb-1" />
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-success rounded-full border-4 border-surface" />
                                        </div>
                                        <div className="mt-12">
                                            <button onClick={() => setActiveTab("Profiles")} className="px-4 py-1.5 bg-accent-violet text-white text-sm font-medium rounded-md hover:bg-accent-violet/90 transition-colors">
                                                Edit User Profile
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-surface-raised rounded-lg p-4 space-y-4 border border-border mt-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-micro font-bold text-text-muted uppercase tracking-wider mb-1">Display Name</p>
                                                <p className="text-body text-text-primary">{user?.displayName}</p>
                                            </div>
                                            <button onClick={() => setActiveTab("Profiles")} className="px-4 py-1.5 bg-surface border border-border hover:bg-hover-row text-text-primary text-sm font-medium rounded-md transition-colors">
                                                Edit
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-micro font-bold text-text-muted uppercase tracking-wider mb-1">Username</p>
                                                <p className="text-body text-text-primary">@{user?.username}</p>
                                            </div>
                                            <button onClick={() => alert("Username change is disabled natively at this time.")} className="px-4 py-1.5 bg-surface border border-border hover:bg-hover-row text-text-primary text-sm font-medium rounded-md transition-colors">
                                                Edit
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-micro font-bold text-text-muted uppercase tracking-wider mb-1">Email</p>
                                                <p className="text-body text-text-primary">{user?.email}</p>
                                            </div>
                                            <button onClick={() => alert("Email change via settings is a premium feature.")} className="px-4 py-1.5 bg-surface border border-border hover:bg-hover-row text-text-primary text-sm font-medium rounded-md transition-colors">
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Profiles" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Profiles</h2>
                            <div className="flex gap-10">
                                <div className="flex-1 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Display Name</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            onBlur={handleUpdateProfile}
                                            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-text-primary outline-none focus:border-accent-violet"
                                        />
                                    </div>
                                    <div className="space-y-2 border-t border-border pt-6">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Avatar</label>
                                        <div className="flex items-center gap-4">
                                            <button onClick={handleChangeAvatar} className="px-4 py-2 bg-accent-violet text-white text-sm font-medium rounded-md hover:bg-accent-violet/90 transition-colors">
                                                Change Avatar
                                            </button>
                                            <button onClick={handleRemoveAvatar} className="px-4 py-2 font-medium text-sm text-text-primary hover:underline">
                                                Remove Avatar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-[300px]">
                                    <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Preview</div>
                                    <div className="bg-surface rounded-xl overflow-hidden border border-border shadow-lg">
                                        <div className="h-20 bg-accent-violet/30" />
                                        <div className="px-4 pb-4">
                                            <img
                                                src={avatarUrl}
                                                alt="Avatar"
                                                className="w-16 h-16 rounded-full border-4 border-surface -mt-8 bg-surface-raised relative z-10 object-cover"
                                            />
                                            <div className="mt-2 bg-surface-raised p-2 rounded-lg border border-border">
                                                <div className="font-bold text-text-primary">{displayName || user?.displayName}</div>
                                                <div className="text-xs text-text-muted">@{user?.username}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Appearance" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Appearance</h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Theme</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <label
                                            className={`group relative border-2 cursor-pointer rounded-lg overflow-hidden transition-colors ${theme === "light" ? "border-accent-violet" : "border-border hover:border-text-muted"}`}
                                            onClick={() => handleThemeChange("light")}
                                        >
                                            <div className="h-24 bg-[#E3E5E8] p-3 text-left">
                                                <div className="w-2/3 h-2 bg-[#F2F3F5] rounded-full mb-2" />
                                                <div className="w-1/2 h-2 bg-[#F2F3F5] rounded-full" />
                                            </div>
                                            <div className="p-3 bg-white flex items-center justify-between">
                                                <span className="text-sm font-medium text-black">Light</span>
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${theme === "light" ? "border-[4px] border-accent-violet bg-white" : "border-gray-300"}`} />
                                            </div>
                                        </label>

                                        <label
                                            className={`group relative border-2 cursor-pointer rounded-lg overflow-hidden transition-colors ${theme === "dark" ? "border-accent-violet" : "border-border hover:border-text-muted"}`}
                                            onClick={() => handleThemeChange("dark")}
                                        >
                                            <div className="h-24 bg-[#313338] p-3 text-left">
                                                <div className="w-2/3 h-2 bg-[#2B2D31] rounded-full mb-2" />
                                                <div className="w-1/2 h-2 bg-[#2B2D31] rounded-full" />
                                            </div>
                                            <div className="p-3 bg-[#111214] flex items-center justify-between">
                                                <span className="text-sm font-medium text-white">Dark</span>
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${theme === "dark" ? "border-[4px] border-accent-violet bg-white" : "border-[#4e5058]"}`} />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Voice & Video" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Voice & Video</h2>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Input Device</label>
                                        <select
                                            value={audioInputId}
                                            onChange={(e) => setAudioInputId(e.target.value)}
                                            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-text-primary outline-none focus:border-accent-violet cursor-pointer appearance-none"
                                        >
                                            {audioInputs.length === 0 && <option value="default">Default System Device</option>}
                                            {audioInputs.map(d => (
                                                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Unknown Microphone'}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Output Device</label>
                                        <select
                                            value={audioOutputId}
                                            onChange={(e) => setAudioOutputId(e.target.value)}
                                            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-text-primary outline-none focus:border-accent-violet cursor-pointer appearance-none"
                                        >
                                            {audioOutputs.length === 0 && <option value="default">Default System Device</option>}
                                            {audioOutputs.map(d => (
                                                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Unknown Speaker'}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border">
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Input Mode</h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer" onClick={() => setPushToTalk(false)}>
                                            <div className={`w-5 h-5 rounded-full border ${!pushToTalk ? "border-[5px] border-accent-violet bg-white" : "border-border bg-surface"}`} />
                                            <span className="text-body text-text-primary">Voice Activity</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer" onClick={() => setPushToTalk(true)}>
                                            <div className={`w-5 h-5 rounded-full border ${pushToTalk ? "border-[5px] border-accent-violet bg-white" : "border-border bg-surface"}`} />
                                            <span className="text-body text-text-primary">Push to Talk</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Close button */}
            <div className="absolute top-14 right-10">
                <button
                    onClick={onClose}
                    className="w-9 h-9 flex flex-col items-center justify-center text-text-muted hover:text-text-primary transition-colors group"
                >
                    <div className="w-9 h-9 rounded-full border-2 border-text-muted group-hover:border-text-primary group-hover:bg-surface-raised flex items-center justify-center mb-1 transition-all">
                        <X className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold uppercase">ESC</span>
                </button>
            </div>
        </div>
    );
}
