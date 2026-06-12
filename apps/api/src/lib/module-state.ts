import { prisma } from "./prisma.js";

export const CHANNEL_TYPES = [
    "text",
    "voice",
    "announcement",
    "forum",
    "stage",
    "board",
    "docs",
    "canvas",
    "github",
    "incident",
] as const;

type ModuleChannel = {
    id: string;
    name: string;
    type: string;
    serverId?: string;
};

export function emptyBoard(channel: ModuleChannel) {
    return {
        id: channel.id,
        name: channel.name,
        columns: [
            { id: `${channel.id}-todo`, title: "Todo", cards: [] },
            { id: `${channel.id}-doing`, title: "In progress", cards: [] },
            { id: `${channel.id}-done`, title: "Done", cards: [] },
        ],
    };
}

export function emptyIncident() {
    return {
        status: "active",
        severity: "P3",
        services: [],
        duration: "just opened",
        timeline: [
            {
                at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: "Incident channel created",
            },
        ],
    };
}

export async function ensureChannelModuleState(channel: ModuleChannel) {
    if (channel.type === "board") {
        await prisma.channelBoard.upsert({
            where: { channelId: channel.id },
            update: {},
            create: { channelId: channel.id, board: emptyBoard(channel) },
        });
    } else if (channel.type === "docs") {
        await prisma.channelDocs.upsert({
            where: { channelId: channel.id },
            update: {},
            create: { channelId: channel.id, docs: [] },
        });
    } else if (channel.type === "incident") {
        await prisma.channelIncident.upsert({
            where: { channelId: channel.id },
            update: {},
            create: { channelId: channel.id, incident: emptyIncident() },
        });
    } else if (channel.type === "canvas") {
        await prisma.channelCanvas.upsert({
            where: { channelId: channel.id },
            update: {},
            create: { channelId: channel.id, data: {} },
        });
    } else if (channel.type === "github") {
        await prisma.channelGitHub.upsert({
            where: { channelId: channel.id },
            update: {},
            create: { channelId: channel.id, config: {}, pullRequests: [] },
        });
    }
}

export async function ensureChannelModuleStates(channels: ModuleChannel[]) {
    await Promise.all(channels.map((channel) => ensureChannelModuleState(channel)));
}

export async function getModuleStateForServer(serverId: string) {
    const [boards, docs, incidents, canvases, github] = await Promise.all([
        prisma.channelBoard.findMany({
            where: { channel: { serverId } },
            select: { channelId: true, board: true },
        }),
        prisma.channelDocs.findMany({
            where: { channel: { serverId } },
            select: { channelId: true, docs: true },
        }),
        prisma.channelIncident.findMany({
            where: { channel: { serverId } },
            select: { channelId: true, incident: true },
        }),
        prisma.channelCanvas.findMany({
            where: { channel: { serverId } },
            select: { channelId: true, data: true },
        }),
        prisma.channelGitHub.findMany({
            where: { channel: { serverId } },
            select: { channelId: true, config: true, pullRequests: true },
        }),
    ]);

    return {
        boardsByChannel: Object.fromEntries(boards.map((row) => [row.channelId, row.board])),
        docsByChannel: Object.fromEntries(docs.map((row) => [row.channelId, row.docs])),
        incidentsByChannel: Object.fromEntries(incidents.map((row) => [row.channelId, row.incident])),
        canvasByChannel: Object.fromEntries(canvases.map((row) => [row.channelId, row.data])),
        prsByChannel: Object.fromEntries(github.map((row) => [row.channelId, row.pullRequests])),
        githubConfigByChannel: Object.fromEntries(github.map((row) => [row.channelId, row.config])),
    };
}
