import { cn } from "@corvus/ui";

/** Clean, precise switch — no border, amber when on (brief §Settings). */
export function Toggle({
  checked,
  onChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-surface-overlay"
      )}
    >
      <span
        className="absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition-[left] duration-150 ease-out"
        style={{ left: checked ? 19 : 3 }}
      />
    </button>
  );
}
