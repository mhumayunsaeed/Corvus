<p align="center">
  <img src="Corvus.png" alt="Corvus" width="120" />
</p>

<h1 align="center">Corvus</h1>

<p align="center">
  <strong>A modern, privacy-first communication platform.</strong><br/>
  Open-source alternative to Discord &mdash; built with Tauri, Next.js, and Hono.
</p>

<p align="center">
  <a href="https://github.com/Humayun-glitch/Corvus/stargazers"><img src="https://img.shields.io/github/stars/Humayun-glitch/Corvus?style=flat-square" alt="Stars" /></a>
  <a href="https://github.com/Humayun-glitch/Corvus/network/members"><img src="https://img.shields.io/github/forks/Humayun-glitch/Corvus?style=flat-square" alt="Forks" /></a>
  <a href="https://github.com/Humayun-glitch/Corvus/issues"><img src="https://img.shields.io/github/issues/Humayun-glitch/Corvus?style=flat-square" alt="Issues" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="License" /></a>
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

Discord is great, but it's closed-source, collects extensive user data, and locks communities into a single platform. Corvus is built from the ground up to be:

- **Privacy-first** &mdash; no tracking, no data mining, self-hostable
- **Open-source** &mdash; AGPL-3.0 licensed, community-driven development
- **Lightweight** &mdash; ~10 MB desktop app (vs 300+ MB for Electron-based alternatives)
- **Modern stack** &mdash; built with the latest web technologies for performance and developer experience

## Features

- **Real-time messaging** with typing indicators, reactions, threads, and rich embeds
- **Voice & video channels** powered by LiveKit (WebRTC SFU) with screen sharing
- **Direct messages** &mdash; 1:1 and group DMs with call support
- **Servers & channels** with roles, permissions, and invite system
- **Stage channels** with speaker/audience model and raise-hand queue
- **Stickers & file attachments** (images, videos, documents)
- **Desktop app** via Tauri v2 &mdash; native tray, notifications, auto-updater, ~10 MB installer
- **Web app** via Next.js &mdash; works in any modern browser
- **Friend system** with search, requests, blocking
- **Noise suppression & echo cancellation** for crystal-clear voice
- **Push-to-talk** global shortcut on desktop (works even when app is unfocused)

## Screenshots

<p align="center">
  <img src="landingpage.png" alt="Corvus Landing Page" width="100%" />
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
| **Backend** | Hono (HTTP + WebSocket), Prisma 6, PostgreSQL |
| **Desktop** | Tauri 2 (Rust), custom window chrome, system tray, auto-updater |
| **Auth** | JWT (JOSE), Argon2 password hashing |
| **Voice/Video** | LiveKit SFU (WebRTC) |
| **Monorepo** | pnpm workspaces, Turborepo |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Rust](https://www.rust-lang.org/tools/install) (stable, for desktop builds)
- [PostgreSQL](https://www.postgresql.org/) database
- [LiveKit](https://livekit.io/) server (for voice/video features)

### 1. Clone & install

```bash
git clone https://github.com/Humayun-glitch/Corvus.git
cd Corvus
pnpm install
```

### 2. Configure environment

Create `.env` files for the API and web apps:

**`apps/api/.env`**
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/corvus
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000

# Optional
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
EMAIL_FROM=Corvus <noreply@corvus.app>

# Voice/Video (required for voice features)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-livekit-key
LIVEKIT_API_SECRET=your-livekit-secret
```

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Set up the database

```bash
pnpm --filter @corvus/api db:generate
pnpm --filter @corvus/api db:push
```

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
│   ├── web/          # Next.js frontend (web + desktop UI)
│   ├── api/          # Hono API + WebSocket server + Prisma
│   └── desktop/      # Tauri v2 desktop shell (Rust)
├── packages/
│   ├── ui/           # Shared React component library
│   ├── config/       # Shared TS, Tailwind, ESLint configs
│   ├── db/           # Database package (stub)
│   └── trpc/         # tRPC package (stub)
├── render.yaml       # Render deployment blueprint
├── turbo.json        # Turborepo pipeline config
└── package.json      # Root workspace config
```

## Deployment

The project includes a `render.yaml` blueprint for deploying the API and web app to [Render](https://render.com/). Desktop releases are built via GitHub Actions and published to GitHub Releases.

See the [GitHub Actions workflow](.github/workflows/release.yml) for the desktop release pipeline.

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

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

This means you can freely use, modify, and distribute this software, but any modified versions that are made available over a network **must also be open-sourced** under the same license. This protects the community while allowing commercial use.

---

<p align="center">
  Built with care by <a href="https://github.com/Humayun-glitch">Humayun</a> and <a href="https://github.com/Humayun-glitch/Corvus/graphs/contributors">contributors</a>.
</p>

<p align="center">
  <sub>If you find Corvus useful, please consider giving it a star on GitHub!</sub>
</p>
