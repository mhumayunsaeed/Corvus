import { Nav } from "./Nav";
import { Footer } from "./Footer";

/**
 * Shared chrome + typographic content renderer for marketing/docs/legal pages
 * (product pages, developer docs, changelog, legal). Same "terminal newspaper"
 * treatment everywhere: mono eyebrow, 1px rules, 720px reading column.
 */

export type ContentBlock =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "code"; title?: string; code: string }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "note"; text: string };

export interface MarketingPageContent {
  eyebrow: string;
  title: string;
  lede: string;
  /** e.g. "Last updated June 10, 2026" — shown mono under the lede. */
  updated?: string;
  blocks: ContentBlock[];
}

export function MarketingPage({ content }: { content: MarketingPageContent }) {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Nav />
      <main className="px-6">
        <article className="mx-auto max-w-[720px] pb-24 pt-20 sm:pt-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 text-[clamp(32px,5vw,44px)] font-semibold leading-[1.1] tracking-[-0.025em] text-text-primary">
            {content.title}
          </h1>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-[1.65] text-text-secondary">
            {content.lede}
          </p>
          {content.updated && (
            <p className="mt-4 font-mono text-[11px] text-text-muted">{content.updated}</p>
          )}
          <hr className="mt-10 border-border" />

          <div className="mt-10 flex flex-col gap-5">
            {content.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2 className="mt-6 border-t border-border pt-8 text-[22px] font-semibold leading-[1.3] tracking-[-0.01em] text-text-primary">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-2 text-[16px] font-medium leading-[1.4] text-text-primary">
          {block.text}
        </h3>
      );
    case "p":
      return <p className="text-[15px] leading-[1.75] text-text-secondary">{block.text}</p>;
    case "ul":
      return (
        <ul className="flex flex-col gap-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-[1.65] text-text-secondary">
              <span aria-hidden className="shrink-0 font-mono text-[13px] leading-[1.8] text-text-muted">
                —
              </span>
              {item}
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <div className="overflow-hidden rounded-[10px] border border-border bg-surface-raised">
          {block.title && (
            <div className="border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
              {block.title}
            </div>
          )}
          <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-[1.7] text-text-primary/85">
            <code>{block.code}</code>
          </pre>
        </div>
      );
    case "table":
      return (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {block.head.map((h) => (
                <th
                  key={h}
                  className="border-b border-border px-3 py-2 text-left font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={
                      j === 0
                        ? "border-b border-border px-3 py-2.5 font-mono text-[12px] text-text-primary"
                        : "border-b border-border px-3 py-2.5 text-[13px] text-text-secondary"
                    }
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "note":
      return (
        <p className="border-l-2 border-accent pl-4 text-[14px] leading-[1.65] text-text-secondary">
          {block.text}
        </p>
      );
  }
}
