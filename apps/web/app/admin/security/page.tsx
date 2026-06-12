const rows = [
  { label: "Allow public signups", detail: "Anyone with the URL can create an account.", value: "Off" },
  { label: "Require email verification", detail: "Users must confirm their address before joining.", value: "On" },
  { label: "Two-factor authentication", detail: "Required for admins, optional for members.", value: "Admins" },
  { label: "Session lifetime", detail: "Idle sessions are signed out after this period.", value: "30 days" },
];

export default function AdminSecurity() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-text-primary">Security</h1>
      <div className="mt-6 flex flex-col">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-border py-4">
            <div className="pr-6">
              <div className="text-[14px] text-text-primary">{r.label}</div>
              <div className="mt-0.5 text-[12px] text-text-muted">{r.detail}</div>
            </div>
            <span className="font-mono text-[12px] text-text-secondary">{r.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}
