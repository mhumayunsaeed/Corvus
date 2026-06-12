import { notFound } from "next/navigation";
import { MarketingPage, type MarketingPageContent } from "@/components/landing/MarketingPage";

const PAGES: Record<string, MarketingPageContent> = {
  api: {
    eyebrow: "Developers · API",
    title: "REST + WebSocket API.",
    lede:
      "Everything in the Corvus UI is built on the same public API you get. Authenticate with a key, talk JSON over HTTPS, subscribe to events over WebSocket.",
    blocks: [
      { kind: "h2", text: "Authentication" },
      {
        kind: "p",
        text:
          "Create an API key in Settings → Developer. Keys are scoped to a space and a permission set, and can be revoked at any time. Pass the key as a bearer token on every request.",
      },
      {
        kind: "code",
        title: "Request",
        code: `curl https://corvus.yourdomain.com/api/v1/channels \\
  -H "Authorization: Bearer cvk_live_…" \\
  -H "Content-Type: application/json"`,
      },
      { kind: "h2", text: "Core endpoints" },
      {
        kind: "table",
        head: ["Endpoint", "Description"],
        rows: [
          ["GET /api/v1/spaces", "List spaces visible to the key."],
          ["GET /api/v1/channels", "List channels in a space, including boards and docs."],
          ["POST /api/v1/channels/:id/messages", "Send a message. Supports markdown and embeds."],
          ["GET /api/v1/boards/:id/cards", "List cards with column, assignee, and PR links."],
          ["POST /api/v1/boards/:id/cards", "Create a card."],
          ["PATCH /api/v1/cards/:id", "Move, assign, or edit a card."],
          ["GET /api/v1/docs/:id", "Fetch a document as structured blocks."],
          ["GET /api/v1/search?q=", "Full-text search across messages, cards, docs, and PRs."],
        ],
      },
      { kind: "h2", text: "Real-time events" },
      {
        kind: "p",
        text:
          "Connect to /api/v1/gateway over WebSocket and subscribe to the channels you care about. Events arrive as typed JSON frames — messages, card moves, PR updates, presence — the same stream the official clients use.",
      },
      {
        kind: "code",
        title: "Event frame",
        code: `{
  "type": "card.moved",
  "space": "s_9f2k",
  "board": "sprint-12",
  "card": "CARD-042",
  "from": "in-progress",
  "to": "done",
  "actor": "humayun",
  "at": "2026-06-10T14:23:08Z"
}`,
      },
      { kind: "h2", text: "Rate limits and errors" },
      {
        kind: "p",
        text:
          "Limits are per key: 120 requests/minute for reads, 60/minute for writes, with standard X-RateLimit headers. Errors are RFC 7807 problem documents — a machine-readable type, a human-readable title, and the field that failed.",
      },
      {
        kind: "note",
        text:
          "A full OpenAPI 3.1 spec ships with every instance at /api/v1/openapi.json — point your generator at it and skip writing types by hand.",
      },
    ],
  },
  sdk: {
    eyebrow: "Developers · SDK",
    title: "The Corvus SDK.",
    lede:
      "A typed client for Node and the browser that wraps the REST API and the event gateway. One import, full workspace control.",
    blocks: [
      { kind: "h2", text: "Install" },
      { kind: "code", code: `npm install @corvus/sdk` },
      { kind: "h2", text: "Quickstart" },
      {
        kind: "code",
        title: "send-and-track.ts",
        code: `import { CorvusClient } from '@corvus/sdk'

const client = new CorvusClient({ apiKey: process.env.CORVUS_API_KEY })

// Send a message
await client.channel('eng-general').send({
  text: 'PR #42 is ready for review',
})

// Create a kanban card from code
await client.board('sprint-12').cards.create({
  title:    'Review authentication flow',
  assignee: 'humayun',
  due:      '2026-06-20',
  linkedPR: 42,
})`,
      },
      { kind: "h2", text: "Listen for events" },
      {
        kind: "code",
        code: `client.on('message.created', (msg) => {
  if (msg.text.includes('deploy')) {
    client.channel('ops').send({ text: \`Deploy mentioned by \${msg.author}\` })
  }
})

client.on('card.moved', (e) => {
  console.log(\`\${e.card} → \${e.to}\`)
})

await client.connect()`,
      },
      { kind: "h2", text: "Design principles" },
      {
        kind: "ul",
        items: [
          "Fully typed — every resource, event, and error has a TypeScript definition.",
          "Isomorphic — the same client runs in Node, edge runtimes, and the browser.",
          "Honest errors — failed requests throw structured errors with the API's problem document attached.",
          "Zero lock-in — the SDK is a thin layer; anything it does, plain HTTP can do.",
        ],
      },
      {
        kind: "note",
        text: "Python and Go clients are generated from the same OpenAPI spec and track the API version exactly.",
      },
    ],
  },
  webhooks: {
    eyebrow: "Developers · Webhooks",
    title: "Webhooks in and out.",
    lede:
      "Push events from any system into a channel, and let automations call your endpoints when things happen in the workspace.",
    blocks: [
      { kind: "h2", text: "Inbound webhooks" },
      {
        kind: "p",
        text:
          "Every space has an inbound webhook URL. POST JSON to it and the payload routes to a channel as a formatted event line. Use it for CI results, alerts, deploy notifications — anything that can make an HTTP request.",
      },
      {
        kind: "code",
        title: "Inbound",
        code: `curl -X POST https://corvus.yourdomain.com/hooks/{spaceId}/{token} \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "ops",
    "title": "deploy finished",
    "body": "api v1.3.0 → production · 41s",
    "level": "success"
  }'`,
      },
      { kind: "h2", text: "Outbound webhooks" },
      {
        kind: "p",
        text:
          "Outbound webhooks are an automation action: when a trigger fires — a PR merges, a card moves, a user joins — Corvus POSTs a payload you define to a URL you choose. The template is raw JSON with {{variable}} interpolation. No visual builder; you know what a webhook is.",
      },
      {
        kind: "code",
        title: "Payload template",
        code: `{
  "event": "{{event}}",
  "space": "{{space}}",
  "actor": "{{actor}}",
  "card": "{{card.id}}",
  "column": "{{card.column}}",
  "url": "{{url}}"
}`,
      },
      { kind: "h2", text: "Verifying deliveries" },
      {
        kind: "p",
        text:
          "Every outbound request is signed: the X-Corvus-Signature header carries an HMAC-SHA256 of the body using your endpoint's secret. Verify it before trusting the payload, and reject anything older than five minutes by the X-Corvus-Timestamp header.",
      },
      {
        kind: "ul",
        items: [
          "Retries: failed deliveries retry 5 times with exponential backoff.",
          "Headers: add custom key-value headers per endpoint (for your own auth).",
          "Logs: the last 100 deliveries per endpoint, with status and latency, in Space Settings → Webhooks.",
        ],
      },
    ],
  },
  "self-hosting": {
    eyebrow: "Developers · Self-hosting",
    title: "Run Corvus on your own hardware.",
    lede:
      "One command, one container stack, one data volume. A full deployment takes about five minutes on anything that runs Docker.",
    blocks: [
      { kind: "h2", text: "Requirements" },
      {
        kind: "table",
        head: ["Target", "Minimum"],
        rows: [
          ["VPS (recommended)", "1 vCPU, 1 GB RAM — Hetzner, DigitalOcean, Fly.io all work."],
          ["Bare metal", "Ubuntu 22.04 / Debian 12, ARM64 or x86. Raspberry Pi 4+."],
          ["Kubernetes", "Helm chart available; values.yaml documented."],
          ["Storage", "10 GB to start; attachments grow with use."],
        ],
      },
      { kind: "h2", text: "Install" },
      {
        kind: "code",
        title: "Deploy",
        code: `curl -fsSL https://downloads.corvus.app/install.sh | sh
cd corvus-deploy
cp .env.example .env    # set your domain + SMTP
docker-compose up -d`,
      },
      {
        kind: "p",
        text:
          "First boot serves the setup wizard at /setup: create the admin account, name the instance, configure SMTP (or skip it), done. TLS is automatic via the bundled proxy when you point a domain at the box.",
      },
      { kind: "h2", text: "Configuration" },
      {
        kind: "table",
        head: ["Variable", "Purpose"],
        rows: [
          ["CORVUS_DOMAIN", "Public URL of the instance."],
          ["CORVUS_ADMIN_EMAIL", "Bootstrap admin (used by the setup wizard)."],
          ["SMTP_HOST / SMTP_PORT", "Outbound mail for invites and resets."],
          ["S3_ENDPOINT", "Optional: offload attachments to object storage."],
          ["BACKUP_CRON", "Schedule for automatic data-volume snapshots."],
        ],
      },
      { kind: "h2", text: "Updates and backups" },
      {
        kind: "ul",
        items: [
          "Update from the admin panel (Admin → Updates) or with docker-compose pull && up -d.",
          "The data volume is snapshotted automatically before every migration.",
          "Rollback to the previous version is one click while the snapshot is retained.",
          "Nightly backups can ship to any S3-compatible bucket.",
        ],
      },
      {
        kind: "note",
        text:
          "Your instance phones home for exactly one thing: the update check. Set CORVUS_UPDATE_CHECK=off and it makes no outbound requests at all.",
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export default async function DeveloperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = PAGES[slug];
  if (!content) notFound();
  return <MarketingPage content={content} />;
}
