type Feature = {
  glyph: string;
  label: string;
  title: string;
  description: string;
  span: string;
};

const features: Feature[] = [
  {
    glyph: "⟢",
    label: "Messaging",
    title: "Real-time messaging",
    description:
      "Sub-100ms message delivery over WebSockets. Built for high-throughput, low-latency applications that can't afford to wait.",
    span: "md:col-span-6",
  },
  {
    glyph: "◉",
    label: "Media",
    title: "Voice & Video",
    description:
      "Constellation-scale voice and video rooms. WebRTC-native, with no third-party media servers required.",
    span: "md:col-span-3",
  },
  {
    glyph: "⬡",
    label: "Security",
    title: "End-to-end encryption",
    description:
      "Every message, call, and file transfer is E2E encrypted by default. A zero-knowledge architecture, end to end.",
    span: "md:col-span-3",
  },
  {
    glyph: "⌘",
    label: "SDK",
    title: "Developer SDK",
    description:
      "REST, WebSocket, and webhook APIs. SDKs for React, Node, Python, and Go. A full OpenAPI spec.",
    span: "md:col-span-2",
  },
  {
    glyph: "◈",
    label: "Deploy",
    title: "Self-hostable",
    description:
      "Deploy on your own infrastructure. Docker Compose in five minutes. No vendor lock-in.",
    span: "md:col-span-2",
  },
  {
    glyph: "▦",
    label: "Project tools",
    title: "Kanban boards, built in.",
    description:
      "Organize work without leaving your workspace. Boards, cards, assignees, and due dates — tied directly to your channels and team.",
    span: "md:col-span-2",
  },
];

export function Features() {
  return (
    <section id="product" className="px-6 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="mx-auto max-w-[420px] text-center text-[32px] font-medium leading-[1.15] tracking-[-0.02em] text-text-primary">
          Everything you need. Nothing you don&apos;t.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-3 md:grid-cols-6">
          {features.map((f) => (
            <article
              key={f.title}
              className={`group rounded-[10px] border border-border bg-surface p-7 transition-colors hover:bg-surface-raised ${f.span}`}
            >
              <span
                className="text-[18px] text-accent-violet"
                aria-hidden
              >
                {f.glyph}
              </span>
              <p className="mt-4 text-[13px] uppercase tracking-[0.1em] text-text-muted">
                {f.label}
              </p>
              <h3 className="mt-2 text-[17px] font-medium text-text-primary">
                {f.title}
              </h3>
              <p className="mt-1.5 max-w-[44ch] text-[14px] leading-[1.55] text-text-secondary">
                {f.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
