import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const users = await p.user.findMany({
    select: { id: true, email: true, username: true, emailVerified: true },
});
console.log("Current users:");
console.log(JSON.stringify(users, null, 2));

const result = await p.user.updateMany({
    where: { emailVerified: false },
    data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
});
console.log(`\nVerified ${result.count} user(s)`);

await p.$disconnect();
