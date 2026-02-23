"use client";

import type { SlashCommandDefinition } from "@/lib/slash-commands";

interface SlashCommandMenuProps {
    commands: SlashCommandDefinition[];
    selectedIndex: number;
    onSelect: (command: SlashCommandDefinition) => void;
    onHover: (index: number) => void;
}

export function SlashCommandMenu({
    commands,
    selectedIndex,
    onSelect,
    onHover,
}: SlashCommandMenuProps) {
    if (commands.length === 0) return null;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-surface shadow-xl z-50 max-h-72 overflow-y-auto">
            <div className="px-3 py-2 text-micro text-text-muted border-b border-border">
                Slash Commands
            </div>
            <div className="p-1">
                {commands.map((command, index) => (
                    <button
                        type="button"
                        key={command.name}
                        onClick={() => onSelect(command)}
                        onMouseEnter={() => onHover(index)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            index === selectedIndex
                                ? "bg-accent-violet/20 text-text-primary"
                                : "hover:bg-hover-row text-text-primary"
                        }`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-body font-semibold">/{command.name}</span>
                            <span className="text-micro text-text-muted truncate">
                                {command.description}
                            </span>
                        </div>
                        <div className="text-micro text-text-muted mt-0.5">{command.usage}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
