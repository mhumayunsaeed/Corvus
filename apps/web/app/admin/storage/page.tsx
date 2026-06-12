const rows = [
  { kind: "Message attachments", size: "412 MB" },
  { kind: "Async clips", size: "284 MB" },
  { kind: "Doc images", size: "96 MB" },
  { kind: "Avatars & space icons", size: "38 MB" },
  { kind: "Database", size: "17 MB" },
];

export default function AdminStorage() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-text-primary">Storage</h1>
      <p className="mt-2 font-mono text-[13px] text-text-secondary">
        847 MB used · local volume <span className="text-text-muted">/var/lib/corvus/data</span>
      </p>
      <div className="mt-6 flex flex-col">
        {rows.map((r) => (
          <div key={r.kind} className="flex h-11 items-center justify-between border-b border-border px-1">
            <span className="text-[13px] text-text-primary">{r.kind}</span>
            <span className="font-mono text-[12px] text-text-muted">{r.size}</span>
          </div>
        ))}
      </div>
    </>
  );
}
