"use client";

const FIELD =
  "mt-2 h-9 w-full rounded-md border border-border bg-surface-input px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-border-active";
const LABEL = "font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary";

export default function AdminSmtp() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-text-primary">SMTP / Email</h1>
      <p className="mt-2 max-w-[56ch] text-[13px] leading-[1.6] text-text-muted">
        Used for invites, password resets, and digests. Leave empty to disable outbound mail.
      </p>

      <form className="mt-6 grid max-w-[520px] grid-cols-[1fr_120px] gap-x-3 gap-y-5">
        <div>
          <label className={LABEL}>Host</label>
          <input className={FIELD} placeholder="smtp.example.com" />
        </div>
        <div>
          <label className={LABEL}>Port</label>
          <input className={`${FIELD} font-mono`} placeholder="587" />
        </div>
        <div className="col-span-2">
          <label className={LABEL}>Username</label>
          <input className={FIELD} placeholder="corvus@example.com" />
        </div>
        <div className="col-span-2">
          <label className={LABEL}>Password</label>
          <input className={FIELD} type="password" placeholder="••••••••" />
        </div>
        <div className="col-span-2">
          <label className={LABEL}>From address</label>
          <input className={FIELD} placeholder="Corvus <no-reply@example.com>" />
        </div>
        <div className="col-span-2 mt-2 flex gap-3">
          <button
            type="button"
            className="h-9 rounded-md bg-accent px-4 text-[14px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            Save
          </button>
          <button
            type="button"
            className="h-9 rounded-md border border-border px-4 text-[14px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
          >
            Send test email
          </button>
        </div>
      </form>
    </>
  );
}
