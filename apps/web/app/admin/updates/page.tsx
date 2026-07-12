export default function AdminUpdates() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-text-primary">Updates</h1>

      <div className="mt-6 flex flex-col gap-1 font-mono text-[13px]">
        <p className="text-text-secondary">
          Current version: <span className="text-text-primary">v1.2.4</span>
        </p>
        <p className="text-text-secondary">
          Latest version:{"  "}
          <span className="text-text-primary">v1.3.0</span>{" "}
          <span className="text-accent">— available</span>
        </p>
      </div>

      <div className="mt-6 max-w-[60ch] text-[14px] leading-[1.65] text-text-secondary">
        <p>
          v1.3.0 adds kanban board automation rules, a docs editor slash menu, incident
          channel timelines and workspace search improvements. Review release notes and
          back up your configured data services before updating.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          className="h-9 rounded-md bg-accent px-4 text-[14px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
        >
          Update to v1.3.0
        </button>
        <button
          type="button"
          className="h-9 rounded-md border border-danger/40 px-4 text-[14px] font-medium text-danger transition-colors hover:bg-danger/10"
        >
          Rollback to v1.2.3
        </button>
      </div>
    </>
  );
}
