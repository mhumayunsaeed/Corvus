"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

const EMOJI_CATEGORIES: Record<string, string[]> = {
    "Smileys": [
        "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
        "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
        "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🫢",
        "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏",
        "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷",
        "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🤠",
        "🥳", "🥸", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "😮",
        "😯", "😲", "😳", "🥺", "🥹", "😦", "😧", "😨", "😰", "😥",
        "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱",
        "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡",
        "👹", "👺", "👻", "👽", "👾", "🤖",
    ],
    "Gestures": [
        "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌",
        "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉",
        "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛",
        "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💅",
        "🤳", "💪", "🦾", "🦿",
    ],
    "Hearts": [
        "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
        "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
        "💟", "♥️", "🫀",
    ],
    "Animals": [
        "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨",
        "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐔",
        "🐧", "🐦", "🦅", "🦆", "🦉", "🐺", "🐗", "🐴", "🦄", "🐝",
        "🐛", "🦋", "🐌", "🐞", "🐜", "🪲", "🪳", "🦂", "🐍", "🦎",
        "🐢", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬",
        "🐳", "🐋", "🦈", "🐊",
    ],
    "Food": [
        "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈",
        "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍆", "🌶️",
        "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🌰", "🍞",
        "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", "🍗",
        "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🫔",
        "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿",
    ],
    "Objects": [
        "⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️",
        "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️",
        "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️",
        "🧭", "⏱️", "⏲️", "⏰", "🕰️", "🔋", "🔌", "💡", "🔦", "🕯️",
        "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰",
    ],
    "Symbols": [
        "💯", "🔥", "⭐", "🌟", "✨", "⚡", "💥", "💫", "🎉", "🎊",
        "✅", "❌", "⭕", "❗", "❓", "‼️", "⁉️", "💤", "💬", "💭",
        "🗯️", "♻️", "🔰", "⚜️", "🔱", "🏳️", "🏴", "🏁", "🚩", "🎌",
        "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️",
    ],
};

const CATEGORY_NAMES = Object.keys(EMOJI_CATEGORIES);

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState(CATEGORY_NAMES[0]);
    const pickerRef = useRef<HTMLDivElement>(null);
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

    const filteredCategories = search.trim()
        ? { "Results": Object.values(EMOJI_CATEGORIES).flat().filter(() => true) }
        : EMOJI_CATEGORIES;

    const scrollToCategory = (name: string) => {
        setActiveCategory(name);
        categoryRefs.current[name]?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div
            ref={pickerRef}
            className="w-[352px] h-[420px] bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden z-50"
        >
            {/* Search */}
            <div className="p-2 border-b border-border">
                <div className="flex items-center gap-2 bg-surface-raised rounded-lg px-3 py-1.5">
                    <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search emoji..."
                        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                        autoFocus
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="text-text-muted hover:text-text-primary">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Category tabs */}
            {!search && (
                <div className="flex gap-0.5 px-2 py-1 border-b border-border overflow-x-auto">
                    {CATEGORY_NAMES.map((name) => (
                        <button
                            key={name}
                            onClick={() => scrollToCategory(name)}
                            className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                                activeCategory === name
                                    ? "bg-accent-violet/15 text-accent-violet font-medium"
                                    : "text-text-muted hover:text-text-primary hover:bg-hover-row"
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji grid */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
                {Object.entries(filteredCategories).map(([category, emojis]) => (
                    <div
                        key={category}
                        ref={(el) => { categoryRefs.current[category] = el; }}
                    >
                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider px-1 py-1.5 sticky top-0 bg-surface z-10">
                            {category}
                        </div>
                        <div className="grid grid-cols-8 gap-0.5">
                            {emojis.map((emoji, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        onSelect(emoji);
                                        onClose();
                                    }}
                                    className="w-9 h-9 flex items-center justify-center text-xl hover:bg-hover-row rounded-md transition-colors"
                                    title={emoji}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
