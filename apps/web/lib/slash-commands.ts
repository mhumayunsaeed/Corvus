export interface SlashCommandDefinition {
    name: string;
    description: string;
    usage: string;
    needsArgs?: boolean;
}

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
    {
        name: "help",
        description: "Show the command list",
        usage: "/help",
    },
    {
        name: "shrug",
        description: "Append a shrug to your text",
        usage: "/shrug [text]",
        needsArgs: false,
    },
    {
        name: "tableflip",
        description: "Flip a table dramatically",
        usage: "/tableflip [text]",
        needsArgs: false,
    },
    {
        name: "unflip",
        description: "Put the table back",
        usage: "/unflip [text]",
        needsArgs: false,
    },
    {
        name: "me",
        description: "Send an action-style message",
        usage: "/me <action>",
        needsArgs: true,
    },
    {
        name: "spoiler",
        description: "Wrap text in spoiler bars",
        usage: "/spoiler <text>",
        needsArgs: true,
    },
    {
        name: "roll",
        description: "Roll dice, e.g. 2d20 (default: 1d6)",
        usage: "/roll [NdM]",
        needsArgs: false,
    },
    {
        name: "coinflip",
        description: "Flip a coin",
        usage: "/coinflip",
    },
    {
        name: "choose",
        description: "Choose one option from a list",
        usage: "/choose <a | b | c>",
        needsArgs: true,
    },
    {
        name: "say",
        description: "Send text exactly as written",
        usage: "/say <text>",
        needsArgs: true,
    },
];

export function extractSlashQuery(input: string): string | null {
    const trimmedStart = input.trimStart();
    if (!trimmedStart.startsWith("/")) return null;
    if (trimmedStart.startsWith("//")) return null;

    const withoutSlash = trimmedStart.slice(1);
    if (withoutSlash.length === 0) return "";

    if (/\s/.test(withoutSlash)) return null;

    return withoutSlash.toLowerCase();
}

export function filterSlashCommands(query: string | null): SlashCommandDefinition[] {
    if (query === null) return [];
    if (!query) return SLASH_COMMANDS;

    const startsWith = SLASH_COMMANDS.filter((command) =>
        command.name.startsWith(query)
    );
    if (startsWith.length > 0) return startsWith;

    return SLASH_COMMANDS.filter((command) => command.name.includes(query));
}

export function formatSlashCommandInput(command: SlashCommandDefinition): string {
    return `/${command.name}${command.needsArgs ? " " : ""}`;
}
