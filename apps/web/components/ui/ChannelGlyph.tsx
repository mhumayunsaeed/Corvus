import { cn } from "@corvus/ui";
import {
  Hash,
  Volume2,
  Radio,
  Megaphone,
  SquareKanban,
  FileText,
  Presentation,
  GitPullRequest,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

/** The channel-type indicator — one icon per channel kind. (brief §SpacePanel) */
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

const ICON: Record<ChannelType, LucideIcon> = {
  text: Hash,
  voice: Volume2,
  stage: Radio,
  announcement: Megaphone,
  board: SquareKanban,
  docs: FileText,
  canvas: Presentation,
  github: GitPullRequest,
  incident: TriangleAlert,
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
  const Icon = ICON[type];
  return (
    <Icon
      aria-hidden
      size={size}
      className={cn(
        "shrink-0",
        type === "incident" ? "text-danger" : "text-text-muted",
        className
      )}
    />
  );
}
