import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { DEFAULT_MEMBER_PERMISSIONS, ADMIN_PERMISSIONS } from "../lib/permissions.js";

const roles = new Hono<AuthEnv>();

roles.use("*", authMiddleware);

// ─── Helper: check if user has manage roles permission ───────────

async function assertCanManageRoles(serverId: string, userId: string) {
    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return null;
    }
    return membership;
}

// ─── GET /servers/:serverId/roles ────────────────────────────────

roles.get("/servers/:serverId/roles", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    // Must be a member
    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });
    if (!membership) {
        return c.json({ error: "Not a member of this server." }, 403);
    }

    const roleList = await prisma.role.findMany({
        where: { serverId },
        include: {
            _count: { select: { members: true } },
        },
        orderBy: { position: "desc" },
    });

    return c.json({
        roles: roleList.map((r) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position,
            permissions: r.permissions,
            isDefault: r.isDefault,
            memberCount: r._count.members,
            createdAt: r.createdAt,
        })),
    });
});

// ─── POST /servers/:serverId/roles ───────────────────────────────

const createRoleSchema = z.object({
    name: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    permissions: z.number().int().optional(),
});

roles.post("/servers/:serverId/roles", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await assertCanManageRoles(serverId, userId);
    if (!membership) {
        return c.json({ error: "You do not have permission to manage roles." }, 403);
    }

    const body = await c.req.json();
    const result = createRoleSchema.safeParse(body);
    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    // Get highest current position
    const highestRole = await prisma.role.findFirst({
        where: { serverId },
        orderBy: { position: "desc" },
    });
    const newPosition = (highestRole?.position ?? 0) + 1;

    const role = await prisma.role.create({
        data: {
            serverId,
            name: result.data.name,
            color: result.data.color ?? null,
            permissions: result.data.permissions ?? DEFAULT_MEMBER_PERMISSIONS,
            position: newPosition,
        },
    });

    return c.json({ role }, 201);
});

// ─── PATCH /roles/:id ────────────────────────────────────────────

const updateRoleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
    permissions: z.number().int().optional(),
    position: z.number().int().optional(),
});

roles.patch("/roles/:id", async (c) => {
    const userId = c.get("userId");
    const roleId = c.req.param("id");

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
        return c.json({ error: "Role not found." }, 404);
    }

    const membership = await assertCanManageRoles(role.serverId, userId);
    if (!membership) {
        return c.json({ error: "You do not have permission to manage roles." }, 403);
    }

    // Only owner can edit roles with higher position or admin-level permissions
    if (membership.role !== "owner") {
        const memberHighestRole = await prisma.role.findFirst({
            where: {
                serverId: role.serverId,
                members: { some: { member: { userId } } },
            },
            orderBy: { position: "desc" },
        });
        if (memberHighestRole && role.position >= memberHighestRole.position) {
            return c.json({ error: "Cannot edit a role at or above your highest role." }, 403);
        }
    }

    const body = await c.req.json();
    const result = updateRoleSchema.safeParse(body);
    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    const updated = await prisma.role.update({
        where: { id: roleId },
        data: {
            ...(result.data.name !== undefined && { name: result.data.name }),
            ...(result.data.color !== undefined && { color: result.data.color }),
            ...(result.data.permissions !== undefined && { permissions: result.data.permissions }),
            ...(result.data.position !== undefined && { position: result.data.position }),
        },
    });

    return c.json({ role: updated });
});

// ─── DELETE /roles/:id ───────────────────────────────────────────

roles.delete("/roles/:id", async (c) => {
    const userId = c.get("userId");
    const roleId = c.req.param("id");

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
        return c.json({ error: "Role not found." }, 404);
    }

    if (role.isDefault) {
        return c.json({ error: "Cannot delete the default @everyone role." }, 403);
    }

    const membership = await assertCanManageRoles(role.serverId, userId);
    if (!membership) {
        return c.json({ error: "You do not have permission to manage roles." }, 403);
    }

    await prisma.role.delete({ where: { id: roleId } });

    return c.json({ message: "Role deleted." });
});

// ─── POST /roles/:id/members/:userId — Assign role ──────────────

roles.post("/roles/:id/members/:userId", async (c) => {
    const currentUserId = c.get("userId");
    const roleId = c.req.param("id");
    const targetUserId = c.req.param("userId");

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
        return c.json({ error: "Role not found." }, 404);
    }

    const membership = await assertCanManageRoles(role.serverId, currentUserId);
    if (!membership) {
        return c.json({ error: "You do not have permission to manage roles." }, 403);
    }

    // Find the target member
    const targetMember = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: role.serverId, userId: targetUserId } },
    });
    if (!targetMember) {
        return c.json({ error: "Member not found." }, 404);
    }

    // Assign role
    await prisma.serverMemberRole.upsert({
        where: { memberId_roleId: { memberId: targetMember.id, roleId } },
        create: { memberId: targetMember.id, roleId },
        update: {},
    });

    return c.json({ message: "Role assigned." });
});

// ─── DELETE /roles/:id/members/:userId — Remove role ─────────────

roles.delete("/roles/:id/members/:userId", async (c) => {
    const currentUserId = c.get("userId");
    const roleId = c.req.param("id");
    const targetUserId = c.req.param("userId");

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
        return c.json({ error: "Role not found." }, 404);
    }

    const membership = await assertCanManageRoles(role.serverId, currentUserId);
    if (!membership) {
        return c.json({ error: "You do not have permission to manage roles." }, 403);
    }

    const targetMember = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: role.serverId, userId: targetUserId } },
    });
    if (!targetMember) {
        return c.json({ error: "Member not found." }, 404);
    }

    await prisma.serverMemberRole.deleteMany({
        where: { memberId: targetMember.id, roleId },
    });

    return c.json({ message: "Role removed." });
});

// ─── Initialization: create default roles for a server ───────────

export async function createDefaultRoles(serverId: string) {
    // Create @everyone role
    await prisma.role.upsert({
        where: { serverId_name: { serverId, name: "@everyone" } },
        create: {
            serverId,
            name: "@everyone",
            permissions: DEFAULT_MEMBER_PERMISSIONS,
            position: 0,
            isDefault: true,
        },
        update: {},
    });

    // Create Admin role
    await prisma.role.upsert({
        where: { serverId_name: { serverId, name: "Admin" } },
        create: {
            serverId,
            name: "Admin",
            color: "#7C3AED",
            permissions: ADMIN_PERMISSIONS,
            position: 100,
            isDefault: false,
        },
        update: {},
    });
}

export default roles;
