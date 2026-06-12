const stats = [
  { value: "< 100ms", label: "Latency" },
  { value: "99.99%", label: "Uptime" },
  { value: "~10 MB", label: "Desktop" },
  { value: "E2E Encrypted", label: "by default" },
  { value: "Self-hostable", label: "private cloud" },
];

export function StatsBar() {
  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl border-y border-border">
        <dl className="grid grid-cols-2 md:grid-cols-5">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={[
                "px-6 py-8 text-center md:text-left",
                i < stats.length - 1 ? "md:border-r md:border-border" : "",
                i % 2 === 0 && i < stats.length - 1 ? "border-r border-border md:border-r" : "",
                i < stats.length - 2 ? "border-b border-border md:border-b-0" : "",
                i === stats.length - 1 ? "col-span-2 md:col-span-1" : "",
              ].join(" ")}
            >
              <dt className="text-[24px] font-semibold leading-none tracking-[-0.01em] text-text-primary">
                {stat.value}
              </dt>
              <dd className="mt-2 text-[12px] tracking-[0.04em] text-text-muted">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
