export interface SlashCommandContext {
    username: string;
}

type SlashMessageType = "default" | "system";

export type SlashCommandResult =
    | {
          kind: "not_command";
          content: string;
      }
    | {
          kind: "ok";
          content: string;
          type: SlashMessageType;
      }
    | {
          kind: "error";
          error: string;
      };

function parseDiceNotation(input: string): { count: number; sides: number } | null {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return { count: 1, sides: 6 };

    const match = /^(\d{1,2})d(\d{1,4})$/.exec(trimmed);
    if (!match) return null;

    const count = Number.parseInt(match[1], 10);
    const sides = Number.parseInt(match[2], 10);
    if (!Number.isFinite(count) || !Number.isFinite(sides)) return null;
    if (count < 1 || count > 20) return null;
    if (sides < 2 || sides > 1000) return null;

    return { count, sides };
}

function buildHelpText() {
    return [
        "Available slash commands:",
        "/help - Show this command list",
        "/shrug [text] - Add a shrug to your message",
        "/tableflip [text] - Table flip",
        "/unflip [text] - Put the table back",
        "/me <action> - Roleplay-style action message",
        "/spoiler <text> - Wrap text in spoiler bars",
        "/roll [NdM] - Roll dice (default: 1d6)",
        "/coinflip - Flip a coin",
        "/choose <a | b | c> - Pick one option",
        "/say <text> - Send text as-is",
        "Tip: use // to send a message that starts with /",
    ].join("\n");
}

export function executeSlashCommand(
    rawContent: string,
    context: SlashCommandContext
): SlashCommandResult {
    const content = rawContent ?? "";
    const trimmed = content.trim();

    if (!trimmed.startsWith("/")) {
        return { kind: "not_command", content };
    }

    // Escape hatch for sending plain text beginning with "/"
    if (trimmed.startsWith("//")) {
        return {
            kind: "not_command",
            content: content.replace(/(^\s*)\/\//, "$1/"),
        };
    }

    const rawBody = trimmed.slice(1).trim();
    if (!rawBody) {
        return {
            kind: "error",
            error: 'Unknown command. Use "/help" to list available commands.',
        };
    }

    const firstSpace = rawBody.indexOf(" ");
    const command = (firstSpace === -1 ? rawBody : rawBody.slice(0, firstSpace)).toLowerCase();
    const args = firstSpace === -1 ? "" : rawBody.slice(firstSpace + 1).trim();

    switch (command) {
        case "help":
            return {
                kind: "ok",
                type: "system",
                content: buildHelpText(),
            };

        case "shrug":
            return {
                kind: "ok",
                type: "default",
                content: args ? `${args} ¯\\_(ツ)_/¯` : "¯\\_(ツ)_/¯",
            };

        case "tableflip":
            return {
                kind: "ok",
                type: "default",
                content: args ? `${args} (╯°□°)╯︵ ┻━┻` : "(╯°□°)╯︵ ┻━┻",
            };

        case "unflip":
            return {
                kind: "ok",
                type: "default",
                content: args ? `${args} ┬─┬ ノ( ゜-゜ノ)` : "┬─┬ ノ( ゜-゜ノ)",
            };

        case "me":
            if (!args) {
                return { kind: "error", error: 'Usage: /me <action>' };
            }
            return {
                kind: "ok",
                type: "system",
                content: `${context.username} ${args}`,
            };

        case "spoiler":
            if (!args) {
                return { kind: "error", error: 'Usage: /spoiler <text>' };
            }
            return {
                kind: "ok",
                type: "default",
                content: `||${args}||`,
            };

        case "roll": {
            const parsed = parseDiceNotation(args);
            if (!parsed) {
                return {
                    kind: "error",
                    error: 'Usage: /roll [NdM] with N=1..20 and M=2..1000 (example: /roll 2d20)',
                };
            }
            const rolls = Array.from({ length: parsed.count }, () =>
                Math.floor(Math.random() * parsed.sides) + 1
            );
            const total = rolls.reduce((sum, value) => sum + value, 0);
            const notation = `${parsed.count}d${parsed.sides}`;
            const detail = rolls.join(", ");
            return {
                kind: "ok",
                type: "system",
                content: `${context.username} rolled ${notation}: [${detail}] (total: ${total})`,
            };
        }

        case "coinflip":
        case "flip": {
            const result = Math.random() < 0.5 ? "Heads" : "Tails";
            return {
                kind: "ok",
                type: "system",
                content: `${context.username} flipped a coin: ${result}`,
            };
        }

        case "choose": {
            const options = args
                .split("|")
                .map((option) => option.trim())
                .filter(Boolean);

            if (options.length < 2) {
                return { kind: "error", error: 'Usage: /choose <option 1 | option 2 | ...>' };
            }
            if (options.length > 10) {
                return { kind: "error", error: "Choose supports up to 10 options." };
            }

            const chosen = options[Math.floor(Math.random() * options.length)];
            return {
                kind: "ok",
                type: "system",
                content: `${context.username} chose: ${chosen}`,
            };
        }

        case "say":
            if (!args) {
                return { kind: "error", error: 'Usage: /say <text>' };
            }
            return {
                kind: "ok",
                type: "default",
                content: args,
            };

        default:
            return {
                kind: "error",
                error: `Unknown command "/${command}". Use "/help" to list available commands.`,
            };
    }
}
