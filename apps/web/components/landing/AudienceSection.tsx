const columns = [
  {
    label: "For developers",
    body: "Self-host on your own infrastructure. Full API access, webhooks, and an open protocol.",
  },
  {
    label: "For teams",
    body: "Replace four tools with one. Chat, voice, video, and project boards in a single workspace.",
  },
  {
    label: "For communities",
    body: "Open-source, MIT licensed. Invite your whole server. Runs on a Raspberry Pi.",
  },
];

/**
 * Audience section — three type-only columns, no cards, full-bleed. Sits
 * between the stats bar and the features grid.
 */
export function AudienceSection() {
  return (
    <section className="px-6 py-20 sm:py-24">
      <div className="grid grid-cols-1 sm:grid-cols-3">
        {columns.map((col, i) => (
          <div
            key={col.label}
            className={[
              "border-t border-border pt-4",
              "sm:px-10 sm:first:pl-0 sm:last:pr-0",
              i < columns.length - 1 ? "sm:border-r" : "",
              i > 0 ? "mt-10 sm:mt-0" : "",
            ].join(" ")}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
              {col.label}
            </p>
            <p className="mt-4 max-w-[28ch] text-[15px] leading-[1.65] text-text-secondary">
              {col.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
