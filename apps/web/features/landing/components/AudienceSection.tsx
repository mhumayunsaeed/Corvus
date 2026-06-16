const columns = [
  {
    label: "For developers",
    body: "Deploy on your own infrastructure. Full REST + WebSocket API, webhooks, and admin controls.",
  },
  {
    label: "For teams",
    body: "Replace Slack, Linear, and Notion with one workspace. Chat, voice, boards, and docs live side by side.",
  },
  {
    label: "For communities",
    body: "Bring your whole community into one focused space. Voice, chat, boards, and docs stay under your control.",
  },
];

/**
 * Audience section — three type-only columns, no cards, full-bleed. Sits
 * between the stats bar and the features grid.
 */
export function AudienceSection() {
  return (
    <section className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
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
      </div>
    </section>
  );
}
