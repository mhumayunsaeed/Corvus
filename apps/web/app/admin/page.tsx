const stats = [
  { value: "128", label: "Users" },
  { value: "12", label: "Spaces" },
  { value: "847 MB", label: "Storage used" },
  { value: "v1.2.4", label: "Version" },
];

const activity = [
  "2026-06-10 14:23  humayun created space 'Engineering'",
  "2026-06-10 12:01  System: 847 MB storage used",
  "2026-06-10 09:48  maya invited 3 users",
  "2026-06-09 22:15  System: nightly backup completed",
  "2026-06-09 18:02  alex connected GitHub (corvus/web)",
];

export default function AdminOverview() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-text-primary">Overview</h1>

      {/* Unified bordered stat row — same pattern as the Home screen */}
      <dl className="mt-6 grid grid-cols-2 border-y border-border sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={[
              "px-5 py-6",
              i < stats.length - 1 ? "sm:border-r sm:border-border" : "",
              i % 2 === 0 ? "border-r border-border sm:border-r" : "",
              i < 2 ? "border-b border-border sm:border-b-0" : "",
            ].join(" ")}
          >
            <dt className="font-mono text-[20px] leading-none text-text-primary">{s.value}</dt>
            <dd className="mt-2 text-[12px] tracking-[0.04em] text-text-muted">{s.label}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
        Recent activity
      </h2>
      <div className="mt-3 flex flex-col">
        {activity.map((line) => (
          <p
            key={line}
            className="whitespace-pre border-b border-border py-2.5 font-mono text-[12px] leading-[1.5] text-text-muted"
          >
            {line}
          </p>
        ))}
      </div>
    </>
  );
}
