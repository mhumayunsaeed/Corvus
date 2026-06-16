const targets = [
  {
    label: "VPS (recommended)",
    body: "Any Linux VPS with 1 vCPU / 1 GB RAM. Hetzner, DigitalOcean, Fly.io all work.",
  },
  {
    label: "Bare metal",
    body: "Tested on Ubuntu 22.04 and Debian 12. ARM64 + x86. Raspberry Pi 4+.",
  },
  {
    label: "Kubernetes",
    body: "Helm chart available. values.yaml documented.",
  },
];

const C = ({ children }: { children: React.ReactNode }) => (
  <span className="text-text-muted">{children}</span>
);

/**
 * Self-hosting section — sits directly before the final CTA. One command,
 * three deployment targets. Same type-only column treatment as the
 * Audience section; code block matches the Developer section.
 */
export function SelfHostSection() {
  return (
    <section id="self-host" className="border-t border-border px-6 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent-violet">
          Self-host in five minutes
        </p>
        <h2 className="mt-4 text-[28px] font-medium leading-[1.2] tracking-[-0.02em] text-text-primary">
          One command. Your server. Your data.
        </h2>

        {/* Code block — same styling as the Developer section */}
        <div className="mt-8 overflow-x-auto rounded-[10px] border border-border bg-surface-raised p-6">
          <pre className="font-mono text-[13px] leading-[1.7] text-text-primary/85">
            <code>
              curl -fsSL https://downloads.corvus.app/install.sh | sh{"\n"}
              cd corvus-deploy{"\n"}
              cp .env.example .env    <C>{"# set your domain + SMTP"}</C>
              {"\n"}
              docker-compose up -d
            </code>
          </pre>
        </div>

        <div className="mt-4 flex flex-wrap gap-6">
          <a
            href="#"
            className="text-[14px] font-medium text-accent-violet transition-colors hover:text-accent-violet-bright"
          >
            Full deployment guide →
          </a>
          <a
            href="#"
            className="text-[14px] font-medium text-accent-violet transition-colors hover:text-accent-violet-bright"
          >
            System requirements →
          </a>
        </div>

        {/* Deployment targets — same column style as the Audience section */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3">
          {targets.map((t, i) => (
            <div
              key={t.label}
              className={[
                "border-t border-border pt-4",
                "sm:px-10 sm:first:pl-0 sm:last:pr-0",
                i < targets.length - 1 ? "sm:border-r" : "",
                i > 0 ? "mt-10 sm:mt-0" : "",
              ].join(" ")}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
                {t.label}
              </p>
              <p className="mt-4 max-w-[28ch] text-[15px] leading-[1.65] text-text-secondary">
                {t.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
