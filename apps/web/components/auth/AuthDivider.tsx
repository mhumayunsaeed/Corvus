/** "or" divider — two rules with a centered monospace label (brief §Login). */
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[12px] tracking-[0.04em] text-text-muted">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
