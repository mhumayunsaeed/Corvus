/**
 * Permission bitfield constants for the Corvus role system.
 *
 * Each permission is a single bit. Roles store a bitfield of granted permissions.
 * Channel overrides store separate `allow` and `deny` bitfields.
 */

export const Permissions = {
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

/** Default permissions for the @everyone role */
export const DEFAULT_MEMBER_PERMISSIONS =
    Permissions.VIEW_CHANNEL |
    Permissions.SEND_MESSAGES |
    Permissions.CREATE_INVITES |
    Permissions.CONNECT_VOICE |
    Permissions.SPEAK |
    Permissions.ATTACH_FILES |
    Permissions.USE_REACTIONS;

/** All permissions granted (for admin roles) */
export const ADMIN_PERMISSIONS = ~0 >>> 0; // all 32 bits set

/** Human-readable permission labels */
export const PERMISSION_LABELS: Record<string, string> = {
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

/**
 * Compute the effective permissions for a member in a specific channel.
 *
 * Resolution order:
 *  1. Server owner → all permissions
 *  2. Start with @everyone role permissions
 *  3. OR in permissions from all assigned roles
 *  4. Apply channel overrides: for each role, deny then allow
 *  5. Return final computed bitfield
 */
export function computePermissions(
    isOwner: boolean,
    memberRoleIds: string[],
    allRoles: Array<{ id: string; permissions: number; isDefault: boolean }>,
    channelOverrides?: Array<{ roleId: string; allow: number; deny: number }>
): number {
    // Server owner has all permissions
    if (isOwner) return ADMIN_PERMISSIONS;

    // Start with @everyone role
    const everyoneRole = allRoles.find((r) => r.isDefault);
    let permissions = everyoneRole ? everyoneRole.permissions : DEFAULT_MEMBER_PERMISSIONS;

    // OR in permissions from assigned roles
    for (const roleId of memberRoleIds) {
        const role = allRoles.find((r) => r.id === roleId);
        if (role) {
            permissions |= role.permissions;
        }
    }

    // Apply channel-level overrides
    if (channelOverrides && channelOverrides.length > 0) {
        let channelAllow = 0;
        let channelDeny = 0;

        // Accumulate overrides from @everyone role first
        if (everyoneRole) {
            const everyoneOverride = channelOverrides.find((o) => o.roleId === everyoneRole.id);
            if (everyoneOverride) {
                channelAllow |= everyoneOverride.allow;
                channelDeny |= everyoneOverride.deny;
            }
        }

        // Then from assigned roles (higher position roles take precedence, but we OR them)
        for (const roleId of memberRoleIds) {
            const override = channelOverrides.find((o) => o.roleId === roleId);
            if (override) {
                channelAllow |= override.allow;
                channelDeny |= override.deny;
            }
        }

        // Apply: deny removes bits, allow adds bits
        permissions = (permissions & ~channelDeny) | channelAllow;
    }

    return permissions;
}

/** Check if a permission bitfield includes a specific permission */
export function hasPermission(permissions: number, permission: number): boolean {
    return (permissions & permission) === permission;
}
