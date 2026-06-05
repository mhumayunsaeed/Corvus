import { PrismaClient } from "@prisma/client";

// Prisma's datasource is `env("DATABASE_URL")`. For convenience — especially in
// local dev where only the direct connection is configured — fall back to
// DIRECT_URL when DATABASE_URL is not set. In production/serverless, set
// DATABASE_URL to the pooled (pgbouncer, port 6543) connection string.
const datasourceUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        ...(datasourceUrl ? { datasourceUrl } : {}),
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
