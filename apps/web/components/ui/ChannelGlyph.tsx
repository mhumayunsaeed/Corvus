import { cn } from "@corvus/ui";

/**
 * The signature typographic channel indicator. A monospace character does the
 * job of an icon but reads as native to the text — not pasted on. (brief §SpacePanel)
 */
export type ChannelType =
  | "text"
  | "voice"
  | "stage"
  | "announcement"
  | "board"
  | "docs"
  | "canvas"
  | "github"
  | "incident";

const GLYPH: Record<ChannelType, string> = {
  text: "—", // em-dash
  voice: "◎", // circle with dot
  stage: "◈",
  announcement: "↗",
  board: "▦", // kanban
  docs: "↗",
  canvas: "◈",
  github: "↗",
  incident: "!",
};

export function ChannelGlyph({
  type,
  className,
  size = 14,
}: {
  type: ChannelType;
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-mono leading-none select-none",
        type === "incident" ? "text-danger" : "text-text-muted",
        className
      )}
      style={{ fontSize: size }}
    >
      {GLYPH[type]}
    </span>
  );
}
