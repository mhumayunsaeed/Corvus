# Contributing to Corvus

Thank you for your interest in contributing to Corvus! Whether you're fixing a typo or building a major feature, your help is valued. This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy toward other community members

Harassment, trolling, or any form of disrespectful behavior will not be tolerated. Violations may result in removal from the project.

## How Can I Contribute?

### Good First Issues

Look for issues labeled **[`good first issue`](https://github.com/Humayun-glitch/Corvus/labels/good%20first%20issue)** — these are specifically curated for newcomers. They typically involve:

- UI tweaks and styling fixes
- Small bug fixes
- Documentation improvements
- Adding missing tests

### Areas Where Help Is Needed

| Area | Examples |
|------|----------|
| **Frontend** | UI components, animations, responsive design, accessibility |
| **Backend** | API endpoints, database optimizations, WebSocket event handling |
| **Desktop** | Tauri plugins, native integrations, platform-specific fixes |
| **Voice/Video** | LiveKit integration improvements, audio processing |
| **Documentation** | Guides, API docs, self-hosting docs |
| **Testing** | Unit tests, integration tests, E2E tests |
| **DevOps** | Docker setup, CI/CD improvements, deployment guides |
| **Translations** | i18n support and locale files |

### Not Sure Where to Start?

1. Browse the [open issues](https://github.com/Humayun-glitch/Corvus/issues)
2. Join a discussion in [GitHub Discussions](https://github.com/Humayun-glitch/Corvus/discussions) (if enabled)
3. Comment on an issue you'd like to work on — the maintainers will assign it to you

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust stable (only needed for desktop app development)
- PostgreSQL database
- LiveKit server (only needed for voice/video development)

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Corvus.git
   cd Corvus
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/Humayun-glitch/Corvus.git
   ```

4. **Install dependencies:**
   ```bash
   pnpm install
   ```

5. **Set up environment variables** (see README for full list):
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit .env with your database credentials
   ```

6. **Set up the database:**
   ```bash
   pnpm --filter @corvus/api db:generate
   pnpm --filter @corvus/api db:push
   ```

7. **Start development servers:**
   ```bash
   pnpm dev
   ```

8. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Project Architecture

```
corvus/
├── apps/
│   ├── web/          # Next.js 15 frontend (React 19, Tailwind, Zustand)
│   ├── api/          # Hono API server (Prisma, WebSocket, JWT auth)
│   └── desktop/      # Tauri v2 desktop shell (Rust)
├── packages/
│   ├── ui/           # Shared React components (Button, Modal, etc.)
│   ├── config/       # Shared TypeScript, Tailwind, ESLint configs
│   ├── db/           # Database package
│   └── trpc/         # tRPC definitions
```

### Key Technologies

| Area | Stack |
|------|-------|
| Frontend | Next.js 15, React 19, Tailwind CSS 3.4, Zustand |
| Backend | Hono, Prisma 6, PostgreSQL, WebSocket (`ws`) |
| Desktop | Tauri 2, Rust |
| Auth | JWT (JOSE), Argon2 |
| Voice | LiveKit (WebRTC SFU) |
| Monorepo | pnpm workspaces, Turborepo |

## Pull Request Process

1. **Check for existing issues** — If your change addresses an existing issue, reference it in your PR (e.g., `Closes #42`). If no issue exists, consider creating one first to discuss the approach.

2. **Keep PRs focused** — One feature or fix per PR. Avoid bundling unrelated changes.

3. **Write descriptive PR titles** — Use the format: `feat: add user profile banner` or `fix: voice channel disconnect on tab switch`

4. **Include a description** explaining:
   - What the PR does
   - Why the change is needed
   - How to test it
   - Screenshots/recordings for UI changes

5. **Ensure your code builds:**
   ```bash
   pnpm build
   pnpm lint
   ```

6. **Keep your branch up to date** with `master`:
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

7. **Respond to review feedback** promptly. We aim to review PRs within a few days.

### PR Review Criteria

- Does the code follow existing patterns?
- Is the change well-tested?
- Is the scope appropriate (not too broad)?
- Does it introduce any security concerns?

## Coding Standards

### General

- Use TypeScript for all frontend and backend code
- Use Rust for Tauri desktop shell code
- Follow existing code patterns and conventions in the codebase
- No unused imports or variables
- No `console.log` in committed code (use proper logging if needed)

### Frontend (apps/web)

- Use Tailwind CSS utility classes for styling — no custom CSS files unless necessary
- Use Zustand stores for global state
- Use `async/await` over `.then()` chains
- Component files use PascalCase: `UserProfile.tsx`
- Keep components small and focused

### Backend (apps/api)

- All routes go in `src/routes/` grouped by feature
- Use Prisma for all database access
- Validate inputs at the route level
- Return consistent error shapes: `{ error: string }`
- Use middleware for cross-cutting concerns (auth, logging)

### Desktop (apps/desktop)

- Minimize Rust-side logic — prefer frontend-driven behavior
- Use Tauri plugin APIs over raw Rust where plugins exist
- Test on Windows at minimum; macOS/Linux are bonus

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Optional longer description.
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — Formatting, no code change
- `refactor` — Code restructuring without behavior change
- `test` — Adding or updating tests
- `chore` — Build process, dependency updates, etc.

**Examples:**
```
feat(voice): add per-user volume control slider
fix(chat): prevent duplicate messages on reconnect
docs: update environment variable reference
refactor(api): extract auth middleware to separate module
```

## Reporting Bugs

When reporting a bug, please include:

1. **A clear title** describing the issue
2. **Steps to reproduce** the bug
3. **Expected behavior** vs **actual behavior**
4. **Environment info:** OS, browser, desktop app version
5. **Screenshots or screen recordings** if applicable
6. **Console errors** if any

Use the [Bug Report](https://github.com/Humayun-glitch/Corvus/issues/new?template=bug_report.md) issue template when available.

## Suggesting Features

Feature suggestions are welcome! When proposing a feature:

1. **Check existing issues** to avoid duplicates
2. **Describe the problem** the feature would solve
3. **Propose a solution** with as much detail as helpful
4. **Consider alternatives** you've thought about

Use the [Feature Request](https://github.com/Humayun-glitch/Corvus/issues/new?template=feature_request.md) issue template when available.

## Security Vulnerabilities

If you discover a security vulnerability, **please do NOT open a public issue**. Instead, email the maintainer directly or use GitHub's private vulnerability reporting feature. We take security seriously and will respond promptly.

## Community

- [GitHub Issues](https://github.com/Humayun-glitch/Corvus/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/Humayun-glitch/Corvus/discussions) — Questions, ideas, and general chat
- [GitHub Pull Requests](https://github.com/Humayun-glitch/Corvus/pulls) — Contribute code

---

Thank you for helping make Corvus better! Every contribution, no matter how small, makes a difference.
