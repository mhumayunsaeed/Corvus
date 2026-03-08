"use client";

import { UserAvatar } from "./UserAvatar";

export interface MentionUser {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
}

interface MentionMenuProps {
    users: MentionUser[];
    selectedIndex: number;
    onSelect: (user: MentionUser) => void;
    onHover: (index: number) => void;
}

export function MentionMenu({
    users,
    selectedIndex,
    onSelect,
    onHover,
}: MentionMenuProps) {
    if (users.length === 0) return null;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-surface shadow-xl z-50 max-h-52 overflow-y-auto">
            <div className="px-3 py-2 text-micro text-text-muted border-b border-border">
                Members
            </div>
            <div className="p-1">
                {users.map((user, index) => (
                    <button
                        type="button"
                        key={user.id}
                        onClick={() => onSelect(user)}
                        onMouseEnter={() => onHover(index)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2.5 ${
                            index === selectedIndex
                                ? "bg-accent-violet/20 text-text-primary"
                                : "hover:bg-hover-row text-text-primary"
                        }`}
                    >
                        <UserAvatar
                            avatarUrl={user.avatarUrl}
                            username={user.username}
                            className="w-6 h-6 rounded-full"
                        />
                        <span className="text-body font-medium truncate">
                            {user.displayName}
                        </span>
                        <span className="text-micro text-text-muted truncate">
                            @{user.username}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Extract the @mention query from the input text based on cursor position.
 * Returns null if no active mention query, otherwise returns the search string after @.
 */
export function extractMentionQuery(
    text: string,
    cursorPosition: number
): string | null {
    const textBeforeCursor = text.slice(0, cursorPosition);
    // Find the last @ that starts a mention (preceded by start of string or whitespace)
    const match = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
    if (!match) return null;
    return match[1];
}

/**
 * Filter users by mention query (matches display name or username).
 */
export function filterMentionUsers(
    users: MentionUser[],
    query: string,
    maxResults = 8
): MentionUser[] {
    if (!query && query !== "") return [];
    const lower = query.toLowerCase();
    // Also include @everyone and @here as special entries
    const specials: MentionUser[] = [];
    if ("everyone".startsWith(lower)) {
        specials.push({ id: "__everyone__", displayName: "@everyone", username: "everyone", avatarUrl: null });
    }
    if ("here".startsWith(lower)) {
        specials.push({ id: "__here__", displayName: "@here", username: "here", avatarUrl: null });
    }

    const filtered = users.filter(
        (u) =>
            u.displayName.toLowerCase().includes(lower) ||
            u.username.toLowerCase().includes(lower)
    );
    return [...specials, ...filtered].slice(0, maxResults);
}

/**
 * Apply a mention selection by replacing the @query with @username in the input.
 */
export function applyMention(
    text: string,
    cursorPosition: number,
    user: MentionUser
): { newText: string; newCursor: number } {
    const textBeforeCursor = text.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
    if (!match) return { newText: text, newCursor: cursorPosition };

    const mentionStart = textBeforeCursor.lastIndexOf("@" + match[1]);
    const replacement = `@${user.username} `;
    const newText = text.slice(0, mentionStart) + replacement + text.slice(cursorPosition);
    const newCursor = mentionStart + replacement.length;
    return { newText, newCursor };
}
