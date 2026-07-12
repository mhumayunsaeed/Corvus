import { cn } from "@corvus/ui";

/**
 * Square-rounded avatar — the single strongest break from the Discord pattern.
 * Content avatars are NEVER circles (the one exception is the personal footer
 * avatar, via `shape="circle"`). Radius scales with size per the brief:
 *   rail 40/10 · message 32/8 · list 28/6 · voice 56/12
 */
export function Avatar({
  src,
  name,
  size = 32,
  radius,
  shape = "square",
  className,
}: {
  src?: string | null;
  name?: string;
  size?: number;
  radius?: number;
  shape?: "square" | "circle";
  className?: string;
}) {
  // Default radius derived from size (~1/4) unless explicitly given.
  const r = shape === "circle" ? 9999 : radius ?? Math.round(size / 4);
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-surface-overlay font-semibold text-text-primary",
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        fontSize: Math.round(size * 0.42),
      }}
    >
      <span aria-hidden>{initial}</span>
      {src && (
        <img
          src={src}
          alt={name ?? ""}
          onError={(event) => { event.currentTarget.style.display = "none"; }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
