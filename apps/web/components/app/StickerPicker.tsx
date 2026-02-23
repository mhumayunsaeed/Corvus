"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import { fetchStickers, createSticker, deleteSticker, type StickerData } from "@/lib/api";

interface StickerPickerProps {
    onSelect: (sticker: StickerData) => void;
    onClose: () => void;
}

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
    const [stickers, setStickers] = useState<StickerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"browse" | "create">("browse");
    const [stickerName, setStickerName] = useState("");
    const [stickerPreview, setStickerPreview] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        function handleEsc(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [onClose]);

    const loadStickers = useCallback(async () => {
        try {
            const result = await fetchStickers();
            setStickers(result.stickers);
        } catch (err) {
            console.error("Failed to load stickers:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStickers();
    }, [loadStickers]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("Image must be under 2MB");
            return;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            const size = 128;
            canvas.width = size;
            canvas.height = size;
            // Fit image into square
            const scale = Math.min(size / img.width, size / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx?.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
            setStickerPreview(canvas.toDataURL("image/webp", 0.9));
        };
        img.src = URL.createObjectURL(file);
    };

    const handleCreate = async () => {
        if (!stickerPreview || !stickerName.trim() || creating) return;
        setCreating(true);
        try {
            const result = await createSticker({
                name: stickerName.trim(),
                imageData: stickerPreview,
            });
            setStickers((prev) => [result.sticker, ...prev]);
            setStickerName("");
            setStickerPreview(null);
            setTab("browse");
        } catch (err) {
            console.error("Failed to create sticker:", err);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteSticker(id);
            setStickers((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            console.error("Failed to delete sticker:", err);
        }
    };

    return (
        <div
            ref={pickerRef}
            className="w-[340px] h-[400px] bg-surface border border-border rounded-xl shadow-xl flex flex-col overflow-hidden"
        >
            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0">
                <button
                    onClick={() => setTab("browse")}
                    className={`flex-1 py-2.5 text-body font-medium transition-colors ${tab === "browse"
                        ? "text-accent-violet border-b-2 border-accent-violet"
                        : "text-text-muted hover:text-text-primary"
                        }`}
                >
                    My Stickers
                </button>
                <button
                    onClick={() => setTab("create")}
                    className={`flex-1 py-2.5 text-body font-medium transition-colors ${tab === "create"
                        ? "text-accent-violet border-b-2 border-accent-violet"
                        : "text-text-muted hover:text-text-primary"
                        }`}
                >
                    Create
                </button>
            </div>

            {tab === "browse" ? (
                <div className="flex-1 overflow-y-auto p-3">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
                        </div>
                    ) : stickers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                            <p className="text-body text-text-muted">No stickers yet</p>
                            <button
                                onClick={() => setTab("create")}
                                className="text-body text-accent-violet hover:underline"
                            >
                                Create your first sticker
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {stickers.map((sticker) => (
                                <div key={sticker.id} className="relative group">
                                    <button
                                        onClick={() => onSelect(sticker)}
                                        className="w-full aspect-square rounded-lg bg-surface-raised hover:bg-hover-row p-1.5 transition-colors flex items-center justify-center"
                                        title={sticker.name}
                                    >
                                        <img
                                            src={sticker.imageData}
                                            alt={sticker.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(sticker.id);
                                        }}
                                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-white items-center justify-center hidden group-hover:flex"
                                        title="Delete sticker"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                    <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] text-text-muted truncate px-1">
                                        {sticker.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {/* Image upload area */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-border hover:border-accent-violet cursor-pointer flex items-center justify-center transition-colors bg-surface-raised"
                    >
                        {stickerPreview ? (
                            <img src={stickerPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                        ) : (
                            <div className="text-center">
                                <Plus className="w-8 h-8 text-text-muted mx-auto mb-1" />
                                <span className="text-micro text-text-muted">Upload image</span>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {/* Sticker name */}
                    <input
                        type="text"
                        value={stickerName}
                        onChange={(e) => setStickerName(e.target.value)}
                        placeholder="Sticker name"
                        maxLength={32}
                        className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-violet"
                    />

                    <p className="text-micro text-text-muted">
                        Images are resized to 128x128. Max 2MB. You can have up to 50 stickers.
                    </p>

                    {/* Create button */}
                    <button
                        onClick={handleCreate}
                        disabled={!stickerPreview || !stickerName.trim() || creating}
                        className="w-full py-2 bg-accent-violet text-white rounded-lg font-medium text-body hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {creating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            "Create Sticker"
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
