const users = [
  { name: "humayun", email: "humayun@corvus.app", role: "Owner", spaces: 12, joined: "2025-01-04" },
  { name: "maya", email: "maya@corvus.app", role: "Admin", spaces: 8, joined: "2025-02-11" },
  { name: "alex", email: "alex@corvus.app", role: "Member", spaces: 6, joined: "2025-03-02" },
  { name: "ravi", email: "ravi@corvus.app", role: "Member", spaces: 4, joined: "2025-04-19" },
  { name: "jun", email: "jun@corvus.app", role: "Member", spaces: 5, joined: "2025-05-23" },
  { name: "lena", email: "lena@corvus.app", role: "Member", spaces: 2, joined: "2026-01-15" },
];

const TH = "h-9 px-4 text-left font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-text-muted border-b border-border";
const TD = "h-11 px-4 text-[13px] text-text-primary border-b border-border";

export default function AdminUsers() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-text-primary">Users</h1>
      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr>
            <th className={TH}>User</th>
            <th className={TH}>Email</th>
            <th className={TH}>Role</th>
            <th className={TH}>Spaces</th>
            <th className={TH}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.name} className="transition-colors hover:bg-hover-row">
              <td className={TD}>{u.name}</td>
              <td className={`${TD} text-text-secondary`}>{u.email}</td>
              <td className={TD}>
                <span className="rounded-[3px] border border-border px-[5px] py-px font-mono text-[10px] uppercase tracking-[0.06em] text-text-secondary">
                  {u.role}
                </span>
              </td>
              <td className={`${TD} font-mono text-[12px]`}>{u.spaces}</td>
              <td className={`${TD} font-mono text-[12px] text-text-muted`}>{u.joined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
