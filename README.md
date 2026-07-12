<p align="center">
  <img src="Corvus.png" alt="Corvus" width="120" />
</p>

<h1 align="center">Corvus</h1>

<p align="center">
  <strong>A modern, privacy-first communication platform.</strong><br/>
  A self-hostable alternative to Discord &mdash; built with Tauri, Next.js, and Hono.
</p>

<p align="center">
  <a href="https://github.com/Humayun-glitch/Corvus/stargazers"><img src="https://img.shields.io/github/stars/Humayun-glitch/Corvus?style=flat-square" alt="Stars" /></a>
  <a href="https://github.com/Humayun-glitch/Corvus/network/members"><img src="https://img.shields.io/github/forks/Humayun-glitch/Corvus?style=flat-square" alt="Forks" /></a>
  <a href="https://github.com/Humayun-glitch/Corvus/issues"><img src="https://img.shields.io/github/issues/Humayun-glitch/Corvus?style=flat-square" alt="Issues" /></a>
  <a href="https://github.com/Humayun-glitch/Corvus/pulls"><img src="https://img.shields.io/github/issues-pr/Humayun-glitch/Corvus?style=flat-square" alt="PRs" /></a>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#screenshots">Screenshots</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#project-structure">Project Structure</a> &bull;
  <a href="#contributing">Contributing</a> &bull;
  <a href="#roadmap">Roadmap</a> &bull;
  <a href="#license">License</a>
</p>

---

## Why Corvus?

Discord is great, but it collects extensive user data and locks communities into a single platform. Corvus is built from the ground up to be:

- **Privacy-first** &mdash; no tracking, no data mining, self-hostable
- **No lock-in** &mdash; own your data and run the entire stack on your own infrastructure
- **Lightweight** &mdash; ~10 MB desktop app (vs 300+ MB for Electron-based alternatives)
- **Modern stack** &mdash; built with the latest web technologies for performance and developer experience

## Features

- **Real-time messaging** with typing indicators, reactions, threads, and rich embeds
- **Voice & video channels** powered by LiveKit (WebRTC SFU) with screen sharing
- **Direct messages** &mdash; 1:1 and group DMs with call support
- **Servers & channels** with roles, permissions, and invite system
- **Stage channels** with speaker/audience model and raise-hand queue
- **Stickers & file attachments** (images, videos, documents)
- **Desktop app** via Tauri v2 &mdash; native tray and notifications
- **Web app** via Next.js &mdash; works in any modern browser
- **Friend system** with search, requests, blocking
- **Noise suppression & echo cancellation** for crystal-clear voice

## Screenshots
<img width="1919" height="869" alt="image" src="https://github.com/user-attachments/assets/1d8fc732-ed71-4cbb-9a8d-ef27ca4f409c" />

<p align="center">
  

</p>

<p align="center">
  <em>Landing page &mdash; download the desktop app or open in browser</em>
</p>

<br/>

<details>
<summary><strong>More screenshots</strong> (click to expand)</summary>
<br/>

<p align="center">
  <img src="Corvus.png" alt="Corvus Logo" width="200" />
</p>

<!-- Add more screenshots as the project grows -->
<!-- ![Voice Channels](screenshots/voice.png) -->
<!-- ![Direct Messages](screenshots/dms.png) -->
<!-- ![Server Settings](screenshots/settings.png) -->

*More screenshots coming soon as features are added. Want to help? Take screenshots and open a PR!*

</details>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS, Zustand, LiveKit Client |
| **Backend** | Hono (serverless on Vercel), Prisma 6, Supabase (PostgreSQL, Auth, Storage, Realtime) |
| **Desktop** | Tauri 2 (Rust), custom window chrome, system tray |
| **Auth** | Supabase Auth (email/password + Google OAuth); API issues short-lived app JWTs (JOSE) |
| **Voice/Video** | LiveKit SFU (WebRTC) |
| **Monorepo** | pnpm workspaces, Turborepo |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Rust](https://www.rust-lang.org/tools/install) (stable, for desktop builds)
- [Supabase](https://supabase.com/) project (provides PostgreSQL, Auth, and Storage)
- [LiveKit](https://livekit.io/) server (for voice/video features)

### 1. Clone & install

```bash
git clone https://github.com/Humayun-glitch/Corvus.git
cd Corvus
pnpm install
```

### 2. Configure environment

Create `.env` files for the API and web apps:

**`apps/api/.env`** (see [`apps/api/.env.example`](apps/api/.env.example) for the full list)
```env
PORT=3001
# Supabase Postgres — pooled (6543) for the app, direct (5432) for migrations
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Supabase (server-side)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000

# Voice/Video (required for voice features)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-livekit-key
LIVEKIT_API_SECRET=your-livekit-secret
```

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Auth setup:** In the Supabase dashboard, enable the **Email** provider (and **Google** under
> Authentication → Providers if you want Google sign-in). Add `http://localhost:3000/auth/callback`
> and `http://localhost:3000/reset-password` to **Authentication → URL Configuration → Redirect URLs**.

### 3. Set up the database

Create the application schema from the committed Prisma schema:

```bash
pnpm --filter @corvus/api db:generate
pnpm --filter @corvus/api db:push
```

Then apply [`supabase/realtime-policies.sql`](supabase/realtime-policies.sql) in
the Supabase SQL editor. Production broadcasts use private topics by default;
set `REALTIME_PRIVATE_CHANNELS=false` only for local troubleshooting.

### 3b. Set up Supabase Storage buckets

Creates all required buckets (idempotent — safe to re-run on every deploy):

```bash
pnpm --filter @corvus/api setup:storage
```

| Bucket | Visibility | Used for |
|--------|-----------|----------|
| `avatars` | public | User profile pictures |
| `server-icons` | public | Server icons |
| `attachments` | public | Message attachments (images, video, documents) |
| `stickers` | public | Custom stickers |
| `releases` | public | Desktop installers served by the download button |

Upload an installer for the download button to serve:

```bash
pnpm --filter @corvus/api release:upload -- ./Corvus_x64-setup.exe windows
```

> All buckets are **public-read**; uploads always go through the API
> (authenticated with the app JWT) using the Supabase **service-role** key, so
> the browser never writes to Storage directly. Object keys are random, so URLs
> are unguessable. To make `attachments` private later, flip the bucket to
> private in `scripts/setup-storage.ts` and serve via signed URLs from
> `services/storage.ts`.

### 4. Run in development

```bash
# Run everything (web + api)
pnpm dev

# Or run individually
pnpm dev:web        # Next.js frontend on :3000
pnpm --filter @corvus/api dev   # API server on :3001
pnpm dev:desktop    # Tauri desktop app
```

### 5. Build for production

```bash
pnpm build:web       # Build web app
pnpm build:desktop   # Build desktop installer
```

## Project Structure

```
corvus/
├── apps/
│   ├── web/          # Next.js frontend (web + desktop UI) — deploys to Vercel
│   │   └── vercel.json
│   ├── api/          # Hono API (Prisma + Supabase) — deploys to Vercel functions
│   │   ├── api/          # Vercel serverless entrypoint
│   │   ├── scripts/      # setup-storage.ts (bucket provisioning)
│   │   └── vercel.json
│   └── desktop/      # Tauri v2 desktop shell (Rust)
├── packages/
│   ├── ui/           # Shared React component library
│   └── config/       # Shared TS, Tailwind, ESLint, Prettier configs
├── supabase/         # realtime-policies.sql (optional private-channel RLS)
├── turbo.json        # Turborepo pipeline config
└── package.json      # Root workspace config
```

## Deployment

Both apps deploy to **Vercel** as two separate Vercel projects (set the project
**Root Directory** to `apps/web` and `apps/api` respectively); connect the repo
and Vercel auto-deploys on push.

- **`apps/web`** — Next.js, deployed as a standard Vercel app.
- **`apps/api`** — Hono, deployed as a Vercel **serverless function** (`apps/api/api/index.ts`);
  `vercel.json` rewrites all paths to it. Set the Supabase + LiveKit + `JWT_SECRET` env vars.
- **Realtime** runs on **Supabase Realtime** (Broadcast + Presence), so there is no
  always-on server. See [`apps/api/src/services/realtime.ts`](apps/api/src/services/realtime.ts).
- **Storage buckets** — run `pnpm --filter @corvus/api setup:storage` once after setting env vars.

Desktop releases are built via GitHub Actions and published to GitHub Releases —
see the [release workflow](.github/workflows/release.yml). CI (typecheck + lint)
runs via [`ci.yml`](.github/workflows/ci.yml).

> **Note:** the Vercel serverless config for the API is conventional but was not
> deploy-tested in this environment — verify the function build + the catch-all
> rewrite on your first Vercel deploy. The API can alternatively run as a
> long-running Node server (`pnpm --filter @corvus/api start`) on any host.

## Contributing

We welcome contributions from developers of all experience levels! Whether it's fixing a bug, adding a feature, improving docs, or just reporting an issue &mdash; every contribution matters.

Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** to get started.

### Quick start for contributors

```bash
# 1. Fork & clone
git clone https://github.com/YOUR-USERNAME/Corvus.git
cd Corvus

# 2. Install & setup
pnpm install
pnpm --filter @corvus/api db:generate
pnpm --filter @corvus/api db:push

# 3. Create a branch & start coding
git checkout -b feature/your-feature
pnpm dev
```

Look for issues labeled [`good first issue`](https://github.com/Humayun-glitch/Corvus/labels/good%20first%20issue) to find beginner-friendly tasks.

## Roadmap

- [ ] End-to-end encryption for DMs
- [ ] Plugin/extension system
- [ ] Self-hosting documentation & Docker Compose setup
- [ ] Mobile apps (React Native or Tauri Mobile)
- [ ] Federated server support
- [ ] Theming & custom CSS
- [ ] Bot/webhook API
- [ ] i18n / multi-language support

Have an idea? [Open a feature request](https://github.com/Humayun-glitch/Corvus/issues/new)!

## License

Corvus is free software licensed under the
[GNU Affero General Public License v3.0](LICENSE). You may use, modify, and
redistribute it under the terms of that license.

---

<p align="center">
  Built with care by <a href="https://github.com/mhumayunsaeed">Humayun</a> and <a href="https://github.com/Humayun-glitch/Corvus/graphs/contributors">contributors</a>.
</p>

<p align="center">
  <sub>If you find Corvus useful, please consider giving it a star on GitHub!</sub>
</p>
