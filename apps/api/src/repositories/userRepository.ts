import type { Prisma, User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/**
 * Data-access for the User entity (repository pattern).
 *
 * This is the canonical example of the repository layer: routes/services call
 * these functions instead of touching `prisma` directly, which keeps query
 * logic in one place and the route handlers focused on HTTP concerns. Other
 * entities should follow the same shape under `repositories/`.
 */
export const userRepository = {
    findById(id: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { id } });
    },

    findByUsername(username: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { username } });
    },

    /** Case-insensitive email lookup (emails are stored as entered). */
    async findByEmailInsensitive(email: string): Promise<User | null> {
        const normalized = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email: normalized },
        });
        if (user) return user;

        return prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
        });
    },

    create(data: Prisma.UserCreateInput): Promise<User> {
        return prisma.user.create({ data });
    },

    update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
        return prisma.user.update({ where: { id }, data });
    },

    deleteById(id: string): Promise<User> {
        return prisma.user.delete({ where: { id } });
    },
};
