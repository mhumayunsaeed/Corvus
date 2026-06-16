const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Messaging", href: "/product/messaging" },
      { label: "Voice & Video", href: "/product/voice" },
      { label: "Kanban", href: "/product/kanban" },
      { label: "Docs", href: "/product/docs" },
      { label: "GitHub Connect", href: "/product/github" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "API docs", href: "/developers/api" },
      { label: "SDK", href: "/developers/sdk" },
      { label: "Webhooks", href: "/developers/webhooks" },
      { label: "Self-hosting", href: "/developers/self-hosting" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "Discord", href: "#" },
      { label: "Twitter/X", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Community", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "License", href: "/legal/license" },
      { label: "Security", href: "/legal/security" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-6">
      <div className="mx-auto max-w-6xl">
        {/* Columns */}
        <div className="grid grid-cols-2 gap-8 pb-12 pt-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <img
                src="/corvus-logo-small.png"
                alt=""
                className="h-7 w-7 rounded-full"
                draggable={false}
              />
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">
                Corvus
              </span>
            </div>
            <p className="mt-3 max-w-[220px] text-[13px] leading-[1.5] text-text-muted">
              Secure voice, video, and real-time chat at constellation scale.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <p className="text-[12px] uppercase tracking-[0.1em] text-text-muted">
                {col.heading}
              </p>
              <ul className="mt-4">
                {col.links.map((link) => (
                  <li key={link.label} className="leading-[2]">
                    <a
                      href={link.href}
                      className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-8 sm:flex-row">
          <p className="text-[13px] text-text-muted">
            © 2025 Corvus. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="#"
              aria-label="X"
              className="text-text-muted transition-colors hover:text-text-primary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M12.6 0h2.45l-5.36 6.12L16 16h-4.94l-3.87-5.06L2.76 16H.3l5.73-6.55L0 0h5.06l3.5 4.63L12.6 0zm-.86 14.5h1.36L4.32 1.42H2.86l8.88 13.08z" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="Discord"
              className="text-text-muted transition-colors hover:text-text-primary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M13.55 3.01A13.2 13.2 0 0010.2 2l-.17.32a9.6 9.6 0 014.36 2.13A13.7 13.7 0 008 4.92a13.7 13.7 0 00-6.39 1.53A9.6 9.6 0 015.97 2.3 13.2 13.2 0 005.8 2 13.2 13.2 0 002.45 3.01C.84 5.5.27 7.93.46 10.32a13.4 13.4 0 003.96 1.97l.32-.45c-.43-.16-.84-.36-1.23-.6.1-.07.2-.15.3-.22a9.5 9.5 0 008.38 0c.1.07.2.15.3.22-.39.24-.8.44-1.23.6l.32.45a13.4 13.4 0 003.96-1.97c.23-2.77-.4-5.18-2.31-7.31zM5.62 9.1c-.77 0-1.4-.71-1.4-1.58 0-.87.62-1.58 1.4-1.58.78 0 1.41.71 1.4 1.58 0 .87-.62 1.58-1.4 1.58zm4.76 0c-.77 0-1.4-.71-1.4-1.58 0-.87.62-1.58 1.4-1.58.78 0 1.41.71 1.4 1.58 0 .87-.62 1.58-1.4 1.58z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
