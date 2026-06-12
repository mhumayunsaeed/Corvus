const spaces = [
  { name: "Corvus", members: 42, channels: 14, storage: "312 MB" },
  { name: "Protocol", members: 9, channels: 5, storage: "88 MB" },
  { name: "Homelab", members: 3, channels: 2, storage: "21 MB" },
  { name: "Engineering", members: 26, channels: 11, storage: "426 MB" },
];

const TH = "h-9 px-4 text-left font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-text-muted border-b border-border";
const TD = "h-11 px-4 text-[13px] text-text-primary border-b border-border";

export default function AdminSpaces() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-text-primary">Spaces</h1>
      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr>
            <th className={TH}>Space</th>
            <th className={TH}>Members</th>
            <th className={TH}>Channels</th>
            <th className={TH}>Storage</th>
          </tr>
        </thead>
        <tbody>
          {spaces.map((s) => (
            <tr key={s.name} className="transition-colors hover:bg-hover-row">
              <td className={TD}>{s.name}</td>
              <td className={`${TD} font-mono text-[12px]`}>{s.members}</td>
              <td className={`${TD} font-mono text-[12px]`}>{s.channels}</td>
              <td className={`${TD} font-mono text-[12px] text-text-muted`}>{s.storage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
