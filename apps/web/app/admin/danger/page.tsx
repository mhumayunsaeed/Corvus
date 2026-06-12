const actions = [
  { label: "Export all data", detail: "Full instance export — users, spaces, messages, files.", button: "Export" },
  { label: "Purge deleted content", detail: "Permanently remove soft-deleted messages and files.", button: "Purge" },
  { label: "Shut down instance", detail: "Stops the server. Data volume is preserved.", button: "Shut down" },
];

export default function AdminDanger() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-danger">Danger zone</h1>
      <div className="mt-6 flex flex-col">
        {actions.map((a) => (
          <div key={a.label} className="flex items-center justify-between border-b border-border py-4">
            <div className="pr-6">
              <div className="text-[14px] text-text-primary">{a.label}</div>
              <div className="mt-0.5 text-[12px] text-text-muted">{a.detail}</div>
            </div>
            <button
              type="button"
              className="h-8 shrink-0 rounded-md border border-danger/40 px-3 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
            >
              {a.button}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
