import { cn } from "../lib/utils";

export type StatusType = "online" | "idle" | "dnd" | "offline" | "invisible";

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  status?: StatusType;
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  online: "bg-success",
  idle: "bg-yellow-500",
  dnd: "bg-danger",
  offline: "bg-text-muted",
  invisible: "bg-text-muted",
};

export function Avatar({
  src,
  alt = "",
  size = 36,
  status,
  className,
}: AvatarProps) {
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full bg-accent-violet/30 flex items-center justify-center text-text-primary font-medium"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {alt?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            statusColors[status]
          )}
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      )}
    </div>
  );
}
