const integrations = [
  { name: "GitHub", detail: "OAuth app · 2 repositories connected", connected: true },
  { name: "SMTP relay", detail: "Outbound mail via smtp.corvus.app", connected: true },
  { name: "S3-compatible storage", detail: "Offload attachments to object storage", connected: false },
];

export default function AdminIntegrations() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-text-primary">Integrations</h1>
      <div className="mt-6 flex flex-col">
        {integrations.map((i) => (
          <div key={i.name} className="flex items-center justify-between border-b border-border py-4">
            <div>
              <div className="flex items-center gap-2 text-[14px] text-text-primary">
                {i.name}
                {i.connected && (
                  <span className="flex h-5 items-center rounded-[3px] border border-success/30 px-2 font-mono text-[10px] uppercase tracking-[0.04em] text-success">
                    connected
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[12px] text-text-muted">{i.detail}</div>
            </div>
            <button
              type="button"
              className="h-8 rounded-md border border-border px-3 text-[13px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
            >
              {i.connected ? "Configure" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
