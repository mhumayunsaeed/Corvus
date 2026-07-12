import { notFound } from "next/navigation";
import { MarketingPage, type MarketingPageContent } from "@/features/landing/components/MarketingPage";

const repo = "https://github.com/Humayun-glitch/Corvus";

const PAGES: Record<string, MarketingPageContent> = {
  api: {
    eyebrow: "Developers · Current API",
    title: "Follow the API that exists today.",
    lede: "Corvus uses a Hono API with route modules for authentication, spaces, channels, messages, direct messages, attachments, calls, voice and workspace data.",
    blocks: [
      { kind: "h2", text: "Repository-first documentation" },
      { kind: "p", text: "The current API is implemented in apps/api/src/routes and consumed by the web application through its typed API helpers. A stable public API contract and published OpenAPI specification are not advertised as available yet." },
      { kind: "code", title: "Inspect the route modules", code: `git clone ${repo}.git\ncd Corvus\nls apps/api/src/routes` },
      { kind: "note", text: "Use the repository and issue tracker for current behaviour. Do not build against an assumed /api/v1 contract from older marketing material." },
    ],
  },
  sdk: {
    eyebrow: "Developers · SDK status",
    title: "No fictional SDK surface.",
    lede: "Corvus does not currently publish React, Node, Python or Go SDK packages.",
    blocks: [
      { kind: "h2", text: "Contribute against the monorepo" },
      { kind: "p", text: "The supported developer path today is the source repository: Next.js for the web client, Hono for the API, Supabase for data and realtime, LiveKit for media, and Tauri for desktop packaging." },
      { kind: "code", title: "Local setup", code: `pnpm install\npnpm dev\n\n# desktop shell\npnpm dev:desktop` },
      { kind: "note", text: "Published client SDKs and language support should be treated as future work unless a release in the repository explicitly adds them." },
    ],
  },
  webhooks: {
    eyebrow: "Developers · Experimental",
    title: "Automation UI, not a promised webhook platform.",
    lede: "The workspace includes experimental automation and webhook settings surfaces, but a stable inbound/outbound webhook API is not documented as production-ready.",
    blocks: [
      { kind: "h2", text: "Current status" },
      { kind: "p", text: "Treat webhook controls in the demo as an experimental product surface. Signing, delivery retries, logs, limits and a public integration contract are not guaranteed by the current repository documentation." },
      { kind: "note", text: "Track implementation progress and propose integrations through the public issue tracker." },
    ],
  },
  "self-hosting": {
    eyebrow: "Developers · Self-hosting status",
    title: "Designed for control. Deployment work continues.",
    lede: "The source and local-development instructions are available today. Complete self-hosting documentation and Docker Compose setup remain roadmap items.",
    blocks: [
      { kind: "h2", text: "What you can run locally" },
      { kind: "p", text: "The monorepo contains a Next.js web application, a Hono API, a Tauri desktop shell, Prisma data models, Supabase realtime policies and LiveKit integration. README setup requires your own Supabase and LiveKit services." },
      { kind: "code", title: "Development", code: `git clone ${repo}.git\ncd Corvus\npnpm install\npnpm dev` },
      { kind: "h2", text: "Deployment status" },
      { kind: "note", text: "One-command deployment, Docker Compose, Helm charts, Kubernetes support, ARM64 images and Raspberry Pi support are not claimed as complete. Follow the roadmap for progress." },
    ],
  },
};

export function generateStaticParams() { return Object.keys(PAGES).map((slug) => ({ slug })); }

export default async function DeveloperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = PAGES[slug];
  if (!content) notFound();
  return <MarketingPage content={content} />;
}
