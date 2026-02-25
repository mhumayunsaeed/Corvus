import { getUsernameColor } from "@/lib/color-utils";

interface UserAvatarProps {
    avatarUrl?: string | null;
    username: string;
    className?: string;
}

export function UserAvatar({ avatarUrl, username, className = "" }: UserAvatarProps) {
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={username}
                className={`rounded-full object-cover flex-shrink-0 bg-surface-raised ${className}`}
            />
        );
    }

    // No avatar: render an empty colored circle with initials
    const color = getUsernameColor(username);
    const initial = username ? username.charAt(0).toUpperCase() : "?";

    return (
        <div
            className={`rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white shadow-sm ${className}`}
            style={{ backgroundColor: color }}
        >
            <span style={{ fontSize: "0.5em" }}>{initial}</span>
        </div>
    );
}
