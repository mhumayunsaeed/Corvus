# Veyra — Full Development & Design Prompt

---

## 1. Project Identity

**App Name:** Veyra
**Tagline:** *"Where your world connects."*
**Platform Targets:** Desktop (Windows, macOS, Linux via Tauri), Web (Next.js PWA), Mobile PWA
**Personality:** Modern, minimal, fast, trustworthy, expressive
**Archetype:** A superior, privacy-first alternative to Discord

---

## 2. Brand & Design Language

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| Background | `#0F0F13` | App base, landing page |
| Surface | `#18181F` | Cards, panels, modals |
| Surface Raised | `#1E1E27` | Inputs, hover rows, message input |
| Accent Violet | `#7C6AF7` | CTAs, active states, focus rings |
| Accent Teal | `#3ECFCF` | Status indicators, speaking rings, success highlights |
| Text Primary | `#F0EFF5` | Body text, headings |
| Text Muted | `#8A8A9A` | Timestamps, placeholders, helper labels |
| Success | `#3ECF8E` | Inline validation, online status |
| Danger | `#F75F6E` | Errors, muted mic, destructive actions |
| Border | `#2A2A35` | Dividers, input borders, card outlines |

### Typography

- **UI Text:** Inter (all weights)
- **Code Blocks:** JetBrains Mono
- **Scale:** 11px (micro labels) → 13px (body) → 15px (emphasis) → 20px (headings) → 32px+ (display)

### Design Principles

- No white backgrounds anywhere in the app
- Everything lives on dark canvases — columns feel like one unified surface
- Glassmorphism only for modals and overlays (`backdrop-filter: blur(12px)`)
- Borders are always `#2A2A35`, never harsh whites
- Spacing is generous — breathing room is intentional
- Micro-interactions on every interactive element (hover, focus, active, disabled states annotated)
- Subtle violet glow used for decorative/atmospheric purposes only
- Teal used for live, active, and real-time states

---

## 3. Confirmed Tech Stack

### Desktop Application — Tauri

**Tauri is chosen over Electron. Here is a full explanation of what Tauri is and why it is the correct choice:**

Tauri is a framework for building native desktop applications using web technologies on the frontend and Rust on the backend shell. It is a direct Electron alternative, but architecturally superior in every meaningful way for a production application like Veyra.

Instead of bundling a full copy of Chromium (as Electron does), Tauri uses the operating system's own native webview — WebView2 on Windows, WKWebView on macOS, and WebKitGTK on Linux. This means the final installable Veyra desktop binary is approximately 5–10MB compared to an Electron app which typically ships at 150–200MB before any app code is included.

Tauri fully supports desktop development across all three major operating systems:
- **Windows:** Targets Windows 10 and 11, ships as an `.exe` or `.msi` installer
- **macOS:** Targets macOS 10.15 (Catalina) and later, ships as a `.dmg` or `.app` bundle
- **Linux:** Targets mainstream distributions, ships as `.AppImage`, `.deb`, or `.rpm`

Tauri supports all of the following desktop-native capabilities that Veyra requires:
- System tray icon with context menu (stay-in-tray, notification badge, status toggle)
- Native OS notifications (not web push — actual system notification toasts)
- Custom window chrome (frameless window with custom titlebar, drag regions, traffic light buttons on macOS)
- Global keyboard shortcuts (push-to-talk keybind works even when Veyra is not focused)
- Native file system access (drag-and-drop file upload, file picker dialogs)
- Auto-updater (built-in Tauri updater plugin, silent background updates)
- Deep link handling (`veyra://` protocol for invite links)
- Hardware media device access (microphone, camera, screen capture) via WebRTC
- Rust-based backend commands for performance-critical operations (audio processing, file I/O)

Tauri's security model is also significantly better than Electron's. By default, all Tauri APIs are locked down and must be explicitly allowlisted in `tauri.conf.json`. The Rust shell enforces capability boundaries. There is no `nodeIntegration` surface area.

For Veyra's Next.js frontend, Tauri wraps a local dev server in development mode and an exported static build in production. Since Next.js 16's App Router supports `output: 'export'` for fully static output, the integration is seamless for all non-server-rendered pages. Pages requiring server-side logic use the Hono API server instead.

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 (App Router) | Page routing, SSR/SSG, API routes |
| TailwindCSS | 3.x | Utility-first styling |
| GSAP | 3.x + ScrollTrigger | Page transitions, scroll animations, micro-interactions |
| Framer Motion | 10.x | React component-level animations (complements GSAP) |
| Zustand | 4.x | Lightweight global client state (auth, UI, voice state) |
| TanStack Query | 5.x | Server state, caching, background refetching |
| Zod | 3.x | Runtime schema validation (shared with backend) |

### Desktop Shell

| Technology | Version | Purpose |
|---|---|---|
| Tauri | 2.x | Native desktop wrapper for Windows, macOS, Linux |
| Rust | Stable | Tauri backend shell, performance-critical native commands |

### Backend — Recommended Stack (Replaces Supabase)

**Why not Supabase:** Supabase's real-time layer is built on PostgreSQL logical replication, which introduces latency under high concurrency. Its edge performance has cold-start issues on the free tier and real-time subscriptions require careful management at scale. For a chat platform with thousands of simultaneous message events, a purpose-built architecture is more appropriate.

**The recommended backend stack:**

| Technology | Purpose |
|---|---|
| **Bun** | JavaScript runtime (significantly faster than Node.js for I/O-heavy workloads) |
| **Hono** | Lightweight, edge-first HTTP framework running on Bun |
| **tRPC** | End-to-end type-safe API layer between Next.js frontend and Hono backend |
| **Neon PostgreSQL** | Serverless Postgres — primary database, instant branching, edge-compatible |
| **Prisma ORM** | Type-safe database access, schema migrations, query builder |
| **Upstash Redis** | Pub/sub for real-time events, user presence tracking, caching, rate limiting |
| **BullMQ** | Background job queues (push notifications, media transcoding, audit logs) |
| **LiveKit** | Open-source WebRTC SFU for voice channels, video calls, screen sharing, stage channels |
| **Cloudflare R2** | Object storage for images, attachments, avatars (zero egress fees, global CDN) |
| **Cloudflare Workers** | Edge middleware — auth verification, rate limiting, CDN routing |
| **Auth.js (NextAuth)** | Authentication — email magic link, Google, GitHub, Apple OAuth, JWT in httpOnly cookies |
| **FFmpeg (worker)** | Audio/video transcoding for media attachments via BullMQ worker |

**On WebRTC vs VoIP:**

Traditional VoIP (SIP/RTP stack) is designed for telephony networks, requires complex infrastructure (SIP proxies, media gateways), and has poor native browser support. WebRTC is the correct choice for Veyra. It is browser and app-native, encrypted by default (DTLS-SRTP), and peer-to-peer capable.

However, raw peer-to-peer WebRTC does not scale to voice channels with more than a handful of users. A Selective Forwarding Unit (SFU) is required — it receives each participant's stream and selectively forwards them to other participants without mixing, enabling low-latency, scalable voice and video.

**LiveKit** is the SFU for Veyra. It is open-source, self-hostable, and has first-class SDKs for React and Next.js. It handles all of: voice channels, 1:1 and group video calls, screen sharing with system audio, stage channels (speaker + audience), and data channel messaging. LiveKit targets sub-80ms end-to-end voice latency.

### Design

| Tool | Purpose |
|---|---|
| Google Stitch | UI/UX screen design, component specs, layout grids |

### Testing & Tooling

| Technology | Purpose |
|---|---|
| Vitest | Unit and integration testing |
| Playwright | End-to-end browser and desktop testing (Tauri supports Playwright via WebDriver) |
| ESLint + Prettier | Code quality and formatting |
| Turborepo | Monorepo build system (manages frontend, backend, desktop packages) |

---

## 4. Repository Structure

```
veyra/
├── apps/
│   ├── web/              # Next.js app (web + desktop frontend)
│   ├── desktop/          # Tauri shell (src-tauri/ with Rust code)
│   └── api/              # Bun + Hono backend server
├── packages/
│   ├── db/               # Prisma schema and client
│   ├── ui/               # Shared React component library
│   ├── trpc/             # tRPC router definitions
│   └── config/           # Shared ESLint, TypeScript, Tailwind configs
├── turbo.json
└── package.json
```

---

## 5. Backend Architecture

```
Client (Next.js Web / Tauri Desktop / PWA Mobile)
         │
         ├── tRPC over HTTPS (REST-like, fully typed)
         ├── WebSocket (real-time message events via Upstash Redis pub/sub)
         └── LiveKit SDK (voice/video directly to LiveKit SFU)
         │
         ▼
API Server (Bun + Hono)
         │
         ├── Neon PostgreSQL via Prisma (persistent data)
         ├── Upstash Redis (pub/sub, presence, cache, rate limiting)
         ├── Cloudflare R2 (signed upload URLs for media)
         └── BullMQ Workers
                  ├── Push notifications (Web Push + Tauri native)
                  ├── FFmpeg media transcoding
                  └── Audit log writes
         │
         ▼
Cloudflare Workers (Edge)
         ├── Auth token verification middleware
         ├── CDN routing for R2 assets
         └── Rate limiting at the edge

LiveKit SFU (self-hosted or LiveKit Cloud)
         └── Voice, video, screenshare, stage channels
```

**Authentication flow:** Auth.js handles sessions. On login, a JWT is issued and stored in an httpOnly, SameSite=Strict cookie. Refresh token rotation is enabled. Cloudflare Workers verify the JWT on every edge request before forwarding to the API. Tauri's secure storage (OS keychain) is used to persist session tokens on desktop rather than localStorage.

---

## 6. Animation System

| Trigger | Library | Spec |
|---|---|---|
| Page / route transitions | GSAP | `opacity: 0 → 1`, `y: 10 → 0`, `duration: 0.25s`, `ease: power2.out` |
| Landing page scroll reveals | GSAP ScrollTrigger | Fade-up on enter viewport, stagger 0.08s between elements |
| Server icon mount stagger | GSAP | `y: 8 → 0`, `opacity: 0 → 1`, 0.05s stagger |
| Modal open/close | Framer Motion | `scale: 0.95 → 1`, `opacity: 0 → 1`, `duration: 0.2s`, `ease: easeOut` |
| Message send | Framer Motion | `y: 6 → 0`, `opacity: 0 → 1`, `duration: 0.15s` |
| Typing indicator dots | GSAP | Looping `y: 0 → -3 → 0`, 0.15s stagger per dot, `sine.inOut` |
| Speaking ring pulse | GSAP | Teal ring `scale: 1 → 1.06 → 1`, 0.8s loop, `sine.inOut` |
| Hover/focus states | CSS only | `transition: all 0.15s ease` — no GSAP for simple hover states |
| Voice channel user join | Framer Motion | Tile slides in from edge, `scale: 0.9 → 1` |
| Notification slide-in | Framer Motion | Right panel `x: 420 → 0`, `duration: 0.25s`, `ease: easeOut` |

---

## 7. Performance Targets

| Metric | Target |
|---|---|
| Desktop app cold start to interactive (Tauri) | < 500ms |
| Web PWA Lighthouse score | 90+ |
| Initial JS bundle (Next.js, code-split) | < 300KB |
| Message delivery and render | < 100ms |
| Voice channel end-to-end latency (LiveKit) | < 80ms |
| API p95 response time | < 120ms |
| Tauri binary size (installer) | < 15MB |

---

## 8. Feature Set

### Servers & Channels
- Create and join servers via invite link or discovery
- Text channels, voice channels, announcement channels, forum channels, stage channels
- Channel categories with drag-to-reorder
- Server roles, permissions, and role priority hierarchy
- Custom server emojis and stickers
- Server subscription model: **Veyra Spark** (replaces Discord Nitro/Boost model)

### Messaging
- Real-time messaging with typing indicators
- Read receipts (opt-in per user in privacy settings)
- Rich text editor: bold, italic, underline, strikethrough, code inline, code block, spoiler tags, headers
- Message reactions with standard and custom emojis
- Threaded replies
- Message pinning, editing, deletion with full edit history visible on hover
- Markdown rendering with syntax-highlighted code blocks
- Inline link embeds (title, favicon, description, thumbnail)
- Slash commands (`/gif`, `/poll`, `/remind`, `/me`, custom bot commands)

### Voice & Video
- Voice channels using LiveKit SFU (WebRTC)
- 1:1 and group video calls (up to 25 participants)
- Screen sharing ("Go Live") with system audio capture
- Noise suppression and echo cancellation (RNNoise WebAssembly module)
- Push-to-talk (globally registered keybind on desktop via Tauri) and voice activation modes
- Stage channels: designated speakers, raise-hand queue, audience view
- Per-user volume control slider
- Spatial audio (optional, per voice channel setting)

### Direct Messages
- 1:1 and group DMs (up to 10 participants)
- Friend system: add by username, accept/decline requests, block
- User profiles: custom bio, banner image, linked accounts, activity display

### Notifications
- Desktop: OS-native notifications via Tauri notification plugin (not web push)
- Web: Web Push API via service worker
- Granular settings: per-server, per-channel overrides
- Do Not Disturb mode with scheduled auto-enable (e.g. 11pm–8am)
- Notification center panel with tabs: All, Mentions, Reactions, Server Updates

### Veyra-Exclusive Features (Beyond Discord)
- **E2E Encrypted DMs:** Opt-in Signal Protocol encryption for direct messages
- **No forced phone verification:** Email only required at signup
- **Offline message cache:** Messages stored locally (IndexedDB on web, Rust SQLite via Tauri) — readable without internet
- **Semantic server search:** AI-powered search across message history (vector embeddings via pgvector on Neon)
- **Kanban board channels:** Optional task board view per text channel for team-oriented servers
- **Sandboxed code preview:** Paste a code snippet and run it in an isolated iframe (WebAssembly sandbox)
- **Global push-to-talk:** Works even when Veyra window is not focused, using Tauri's global shortcut registration

---

## 9. Desktop-Specific Development Notes (Tauri)

### Project Setup

```bash
# Create Next.js app
npx create-next-app@latest veyra-web --typescript --tailwind --app

# Add Tauri to the project
cd veyra-web
npx @tauri-apps/cli init

# Install Tauri CLI
cargo install tauri-cli
```

### Next.js Configuration for Tauri

```js
// next.config.js
const nextConfig = {
  output: 'export',        // Static export for Tauri production build
  trailingSlash: true,
  images: { unoptimized: true }, // Required for static export
}
```

In development, Tauri's `devUrl` points to `http://localhost:3000` (Next.js dev server). In production, Tauri's `frontendDist` points to the `out/` directory from `next build`.

### Tauri Configuration (`tauri.conf.json`)

```json
{
  "productName": "Veyra",
  "identifier": "com.veyra.app",
  "build": {
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [{
      "title": "Veyra",
      "width": 1280,
      "height": 800,
      "minWidth": 940,
      "minHeight": 600,
      "decorations": false,
      "transparent": true
    }],
    "trayIcon": {
      "iconPath": "icons/tray.png",
      "tooltip": "Veyra"
    }
  },
  "plugins": {
    "notification": {},
    "global-shortcut": {},
    "updater": {
      "endpoints": ["https://releases.veyra.app/{{target}}/{{current_version}}"],
      "dialog": true
    },
    "store": {}
  }
}
```

### Desktop-Native Features (Rust Commands)

```rust
// src-tauri/src/main.rs

// Custom titlebar window controls
#[tauri::command]
fn minimize_window(window: tauri::Window) { window.minimize().unwrap(); }

#[tauri::command]
fn maximize_window(window: tauri::Window) { window.maximize().unwrap(); }

#[tauri::command]
fn close_window(window: tauri::Window) { window.close().unwrap(); }

// Secure credential storage (OS keychain)
#[tauri::command]
fn store_token(token: String) -> Result<(), String> {
    // Uses OS keychain via keyring crate
}
```

### Custom Window Chrome (Desktop Titlebar)

Since `decorations: false` is set, Veyra renders its own titlebar in the Next.js frontend. The titlebar component uses `data-tauri-drag-region` for the draggable area and renders custom window control buttons (minimize, maximize, close) that call Tauri commands. On macOS, traffic light buttons are retained using `titleBarStyle: "overlay"`.

### Push-to-Talk Global Shortcut

```typescript
// Registered on app mount via Tauri's global shortcut plugin
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';

await register('CmdOrCtrl+Alt+P', () => {
  // Toggle mic mute in LiveKit voice channel
  toggleMicrophone();
});
```

### Auto-Updater

Tauri's built-in updater plugin checks `releases.veyra.app` on app launch. Updates are signed with a private key. The update bundle is a binary diff, not a full reinstall, so updates are fast and small.

### Local Message Cache (Offline Support)

On desktop, Veyra uses Tauri's SQLite plugin (`tauri-plugin-sql`) to cache the last 500 messages per channel in a local SQLite database. On web, IndexedDB via Dexie.js serves the same purpose. When the user opens a channel offline, cached messages render immediately. When connectivity is restored, the real-time subscription catches up from the last message ID.

---

## 10. Google Stitch Design Instructions

All screens are designed for **Veyra** using the color palette and design principles defined in Section 2. Every screen must include:
- The Veyra wordmark or logo where contextually appropriate
- All interactive element states: default, hover, active, focus, disabled
- Responsive breakpoints noted where applicable
- Spacing annotations using an 8px base grid

---

### Screen 1 — Landing / Marketing Page (Web)

**Veyra** branding appears in the navigation bar (logo + wordmark) and footer.

**Layout:** Full-width, single-page vertical scroll, dark throughout.

**Section 1 — Navigation Bar**
Fixed to top. Veyra logo left. Nav links center: Features, Community, Download, Pricing. CTAs right: Log In (ghost button) and Get Started (accent violet, filled). On scroll past hero, nav gains a `#13131A` background with blur backdrop.

**Section 2 — Hero**
Full viewport height. Centered vertically. Headline: "A new era of connection." (display size, `#F0EFF5`). Subheadline: "Veyra brings together everything your community needs — voice, video, and real-time chat — in a faster, cleaner, and more private space." Two CTAs: "Download Veyra" (accent violet filled, with OS icon auto-detected) and "Open in Browser" (outlined, secondary). Below CTAs, a realistic Veyra app mockup (the main server view from Screen 4) centered with a soft violet atmospheric glow behind it. GSAP ScrollTrigger: headline, subheadline, CTAs, and mockup each fade-up on scroll with 0.08s stagger.

**Section 3 — Feature Pills Strip**
Horizontal scrolling strip of icon + label cards on `#18181F` surface. Cards: Real-time Messaging, Crystal-Clear Voice, HD Video, Encrypted DMs, Offline Mode, Smart Search, Kanban Boards, Stage Channels. Subtle left-to-right marquee animation on this strip.

**Section 4 — UI Showcase**
Full-bleed screenshot of Veyra's main interface, slightly inset with rounded corners. Soft violet radial glow behind it on the dark background. Caption below: "Designed for focus. Built for communities."

**Section 5 — Feature Callouts (3 Panels)**
Alternating left/right layout per feature. Text side has headline, 2–3 sentence description, optional secondary CTA. Visual side shows a cropped UI illustration. Features: "Messages that feel alive" (real-time typing, reactions), "Voice that just works" (voice channel view with speaking rings), "Privacy by default" (encrypted DMs illustration).

**Section 6 — Pricing / Veyra Spark**
Two-column cards side by side. Left: Free tier (list of features, "Get Started" CTA). Right: Veyra Spark (highlighted with violet border glow, additional features list, "Subscribe" CTA in accent violet). Simple, readable — no cluttered comparison tables.

**Section 7 — Footer**
Veyra logo + wordmark left. Nav columns: Product, Company, Legal, Community. Social icons right (Twitter/X, GitHub, Discord community). Copyright line muted at very bottom. One-line tagline: "Where your world connects."

---

### Screen 2 — Authentication (Login & Register)

**Veyra** logo and wordmark centered at top of auth card.

**Background:** `#0F0F13` with a very subtle animated gradient mesh (violet + teal, 6% opacity, slow morph).

**Login Card (`#18181F`, 440px wide, 16px radius, `#2A2A35` 1px border):**
- Veyra logo (40px) + "Veyra" wordmark centered at top
- "Welcome back" heading (20px, `#F0EFF5`)
- "Log in to your account" subtext (muted)
- Email input
- Password input with show/hide toggle (eye icon right side)
- "Forgot password?" link — muted, right-aligned below password field
- "Log In" primary CTA (full width, accent violet `#7C6AF7`, 12px radius)
- Divider with "or continue with" text
- OAuth row: Google, GitHub, Apple (outlined icon buttons, equal width)
- Bottom: "New to Veyra? Create an account" link

**Register Card:**
- Same structure
- Fields: Display Name, Username (real-time `@handle` availability — teal checkmark if available, red X if taken), Email, Password, Confirm Password
- Inline field validation: success ring teal, error ring danger red, error message below field
- ToS checkbox: "I agree to Veyra's Terms of Service and Privacy Policy"
- "Create Account" CTA

**Input field spec:** `#1E1E27` background, `#F0EFF5` text, `#2A2A35` default border, `#7C6AF7` focus ring (2px), 10px radius, 14px 12px padding.

---

### Screen 3 — Onboarding Flow

**Veyra** wordmark at the top of the wizard throughout all steps.

**Container:** Centered card, 520px wide. Progress dot row at top (teal filled = completed, violet = current, `#2A2A35` = upcoming).

**Step 1 — Build Your Profile**
"Let's set up your Veyra profile" heading. Avatar upload circle (96px diameter, dashed border, drag-drop or click). "Generate avatar" text link below. Display name field (pre-filled from registration). Username field (pre-filled, editable). Bio textarea (optional, 150 char counter, muted placeholder). Next button.

**Step 2 — Your Interests**
"What are you into?" heading. "Pick up to 5 — we'll find you the right communities." Wrap grid of interest tags (pill buttons, 28px height): Gaming, Music, Art & Design, Development, Anime, Sports, Science, Film, Writing, Finance, Crypto, Fitness, Cooking, Travel, Memes. Selected state: accent violet fill, white text. Deselected: `#2A2A35` border, muted text. Back / Next buttons.

**Step 3 — Discover Servers**
"Servers you'll love" heading with muted subtext: "Based on your interests." Grid of server cards (server icon, name, member count pill, tag pills, Join button). "Skip for now" text link below. Back / Done buttons.

**Step 4 — Get the Desktop App**
"Veyra is even better on desktop" heading. OS auto-detected (show Windows, macOS, or Linux download button accordingly). App icon illustrated large, centered. Below: size note ("Under 15MB") and key desktop features (push-to-talk, native notifications, offline cache). "Skip, stay in browser" muted link.

**Transitions:** Each step slides left-to-right via GSAP when moving forward, right-to-left when going back.

---

### Screen 4 — Main App Shell (Core Layout)

**Veyra** logo button in the server rail serves as the home/DMs nav anchor.

**Layout:** Three-column persistent shell. No white anywhere.

**Column 1 — Server Rail (68px wide, `#0F0F13`)**
- Top: Veyra logo mark icon (40px) as home button, below it a `#2A2A35` divider
- Server icon buttons (48px, rounded 12px, soft drop shadow): hover reveals tooltip with server name right-side
- Active server: 3px violet left-bar indicator, icon with soft violet glow ring
- Unread server: small white dot below icon
- Muted server: reduced opacity icon
- Bottom: "Add Server" button (plus icon, dashed border circle), "Discover" button (compass icon)
- Very bottom: current user avatar (36px, circular) with colored status ring

**Column 2 — Channel Sidebar (240px wide, `#13131A`)**
- Top: Server name (bold, 15px) and chevron-down for server settings dropdown. Bell icon right side for notification settings.
- Channel list by category (collapsible, category name in muted uppercase 11px caps, arrow toggle)
- Channel item: `#` text icon for text channels, speaker icon for voice channels, megaphone for announcements, hash-star for forums
- Active channel: `#1E1E27` background pill spanning full width, primary white text
- Unread channel: bold text, white 6px dot right-side
- Voice channel (when users connected): expanded below the channel name, showing connected user avatars (20px) in a row with speaking rings
- Bottom bar (56px, fixed): user avatar (32px) + display name + discriminator + mute/deafen/settings icon buttons

**Column 3 — Content Area (fills remaining, `#0F0F13`)**
- Top bar (48px): channel name (bold), channel topic (muted, truncated), vertical divider, icons row right: Search, Members, Threads, Pinned Messages
- Messages area: infinite scroll, loads older messages upward
- Message input area (fixed bottom): rounded rectangle `#1E1E27`, left icons (attachment paperclip, GIF), right icons (emoji, stickers, voice message), placeholder "Message #channel-name"
- Above message input: typing indicator "username is typing..." with animated 3-dot loader

**Column 4 — Member Sidebar (220px, `#13131A`, togglable)**
- Shows when Members icon is active in top bar
- Grouped by role: ONLINE header, then member rows (avatar, username, activity subtitle)
- Offline members collapsed at bottom

---

### Screen 5 — Text Channel Chat View

**Veyra**'s chat view uses a message design system that is distinct from Discord's aesthetic.

**Message Row:**
- Left-aligned avatar (36px, circular, shows on first message in a group)
- Username in role-assigned accent color (falls back to `#F0EFF5`)
- Timestamp (muted 11px) right of username
- Message body `#F0EFF5`, 14px, line-height 1.6
- Grouped messages (same user, within 5 minutes): no avatar repeat, body aligns to text column, only timestamp shown on hover

**Hover State on Message Row:**
- Row background shifts to `#1A1A22`
- Floating action pill appears top-right of row: react (emoji icon), reply (reply icon), edit (pencil, own messages only), pin, more (ellipsis dropdown)
- Action pill: `#2A2A35` background, 8px radius, 4px icon padding

**Inline Content Elements:**
- Image attachments: `#1E1E27` background, 12px radius, max 300px height, click to open lightbox overlay with blur backdrop
- Code blocks: `#0A0A0F` background, 8px radius, left-side `#7C6AF7` accent bar, JetBrains Mono, syntax highlighted, copy button top-right
- Link embeds: `#18181F` card, left 3px `#7C6AF7` bar, favicon + site name muted top, bold title, description truncated, optional right thumbnail image
- Reactions: pill shape, `#1E1E27` background with `#2A2A35` border, emoji + count, your reaction: `#2A1F5A` fill with violet border
- Spoiler text: `#2A2A35` background blur, click to reveal

**Message Input Detail:**
- `#1E1E27` background, `#2A2A35` 1px border, 12px radius, 14px 16px padding
- Grows vertically up to 8 lines before scrolling
- Mention autocomplete: dropdown overlay `#18181F` card showing matching usernames with avatars
- Emoji picker: floating panel, `#18181F` background, searchable, categorized, 6 columns of emoji

---

### Screen 6 — Voice Channel View

**Veyra** wordmark shown in the voice control bar at bottom.

**Layout:** Voice channel replaces the content column with a stage/grid view.

**Participant Grid:**
- Auto-layout: 1 person = large centered tile, 2 = side by side, 3–4 = 2×2, 5–9 = 3×3
- Each tile: `#18181F` background, 12px radius, participant avatar centered (64px) or live video feed
- Speaking indicator: teal glow ring (`#3ECFCF`, 2px, pulsing scale animation) around tile border when speaking
- Username bottom-left of tile, small (12px, `#F0EFF5`)
- Status icons bottom-right of tile: mic-muted icon (danger red), deafened icon, streaming dot (teal)
- Screen share tile: full-width at top of grid, participants strip below horizontally

**Bottom Control Bar (`#18181F`, 64px, centered controls):**
- Left zone: voice channel name + server name (muted)
- Center zone (control buttons, 48px circles each): Mute Mic (active = green mic, muted = red mic with slash), Deafen, Share Screen, Toggle Camera, End Call (danger red, slightly wider)
- Right zone: Fullscreen toggle, settings cog
- Active speaking state: control bar gets subtle teal bottom border glow

**Voice Sidebar (Column 2 remains visible):**
- Voice channel expands in channel list to show connected users
- Each connected user: 24px avatar + username + speaking ring + mic/camera status icons inline

---

### Screen 7 — Direct Messages View

**Veyra** logo in server rail remains. Column 2 switches from server channels to DM list.

**DM List (Column 2):**
- "Direct Messages" heading (13px, muted, uppercase) with compose pencil icon right
- "Find or start a conversation" search input (`#1E1E27` background, search icon left)
- "Friends" pinned link at top with pending badge count (accent violet filled badge)
- DM entries: 36px avatar (with status ring), username bold, last message preview muted truncated, timestamp right. Hover: `#1E1E27` background, X to close DM appears far right.
- Group DM entries: stacked avatars or custom group icon, group name, last message preview

**DM Chat (Column 3):**
Same message design as text channels. Top bar adds: recipient username, status dot + status text, Video Call icon button, Voice Call icon button, Profile icon button.

**Friends Screen (Veyra Home — when logo button active):**
Tabs: Online, All Friends, Pending, Blocked, Add Friend. Tab underline in accent violet on active.

- Online/All Friends tab: Friend rows — avatar (with status ring), username, activity subtitle (what game/app they're using), action buttons "Message" + "Voice Call" far right.
- Pending tab: Incoming (with Accept / Decline buttons) and Outgoing (with Cancel button) sections.
- Add Friend tab: Large centered input "Enter a username" with "Send Request" button. Below: "Your friend code is @username" with copy button.

---

### Screen 8 — Server Settings

**Veyra** logo visible in server rail behind the settings overlay.

**Layout:** Full-screen overlay. `rgba(0,0,0,0.7)` backdrop + blur. Two-column settings panel centered (1000px wide, `#13131A` background, 12px radius).

**Left Panel (220px, settings nav):**
Server icon + name at top. Nav items grouped by category label (muted uppercase 11px). Categories: Overview, Roles, Emoji & Stickers, Invites, Members, Bans, Integrations, Audit Log. Divider. Danger Zone: "Delete Server" (danger red text). ESC to close hint bottom.

**Right Panel (780px, settings content):**
Each section header: 13px muted uppercase with a bottom `#2A2A35` divider below.

- **Overview:** Server icon upload (circle, drag-drop), server name input, description textarea, verification level select dropdown, content filter level toggles (switch components, teal fill when on)
- **Roles:** Role list with drag handle + colored dot + role name. Drag to set priority (higher = more powerful). "+ Create Role" button top-right. Click role to open permission editor: permission matrix with toggle rows grouped by category (General, Membership, Text Channels, Voice Channels).
- **Members:** Searchable member table. Columns: user (avatar + name), joined date, roles (pill chips). Inline actions: manage roles, kick (with reason dialog), ban (with reason + duration dialog).
- **Audit Log:** Event timeline, filterable by action type and user. Each entry: action icon, description, responsible user, timestamp.

**Destructive Actions:** All delete/ban/kick buttons in danger red `#F75F6E`. Clicking opens a confirmation dialog (modal on top of settings): bold warning text, type-server-name confirmation input, final destructive CTA.

---

### Screen 9 — User Profile Modal

**Veyra** displays a user's profile card when their username or avatar is clicked.

**Container:** Centered modal, 460px wide, `#18181F` background, 16px radius, blur backdrop.

**Layout:**
- Banner (120px tall, full width at top, custom image or gradient — default gradient uses accent violet → teal)
- Avatar (84px, circular, overlapping banner bottom edge by 32px, with colored status ring)
- Display name (18px bold, `#F0EFF5`) + username handle (muted, 13px) right of avatar at banner-end
- Custom status: emoji + status text (muted, 13px)
- Action buttons row: "Send Message" (primary violet), "Voice Call" (outlined), "Add Friend" / "More" (icon button with dropdown)
- Divider `#2A2A35`
- "Veyra Member Since" — date with Veyra icon
- "Server Member Since" — date with server icon
- Roles section: colored role pills (12px, rounded)
- About Me / Bio: markdown-rendered text block
- Mutual Servers: row of small server icons (28px) with hover tooltips
- Activity (if enabled by user): game/app icon + "Playing [App Name]" with elapsed time

---

### Screen 10 — Notification Center & Settings

**Veyra** displays this as a right-side slide-in panel.

**Notification Center Panel (420px wide, slides from right, `#13131A` background):**
- "Notifications" heading (16px bold) + Mark All Read link (muted) + X close button
- Tabs: All, Mentions, Reactions, Updates — accent violet underline on active
- Notification cards (`#18181F`, 10px radius, 12px padding): server icon left, top-right timestamp, headline (channel/server name, muted), message preview (truncated 2 lines), "Jump to Message" link (teal, 12px). Unread cards have left 3px violet bar.
- "Load more" lazy pagination at bottom

**Notification Settings (accessible from user settings panel):**
- Global notification mode: 3-option toggle (All Messages / Mentions Only / Nothing)
- Scheduled DND: time range picker with day-of-week toggles
- Per-server override list: server icon + name + dropdown override selector
- Push notification preferences: Desktop (toggle), Mobile PWA (toggle), Email digest (toggle + frequency)

---

### Screen 11 — Veyra Desktop App (Custom Window Chrome)

**This screen is specific to the Tauri desktop build of Veyra.**

**Custom Titlebar (32px tall, `#0A0A0F` background, draggable full width):**
- Left: Veyra logo mark (16px) + "Veyra" wordmark (13px, muted)
- Center: (empty — do not place controls here, titlebar drag region must be unobstructed center)
- Right: Window controls — Minimize icon, Maximize/Restore icon, Close icon (close on hover = danger red background). On macOS, use native traffic lights in overlay mode instead.

**System Tray:**
- Tray icon: Veyra logomark monochrome (16x16px, adapts to light/dark OS tray)
- Right-click tray menu: Open Veyra, Status submenu (Online / Idle / Do Not Disturb / Invisible), Mute Notifications (with duration options), Quit Veyra
- Notification badge: red dot on tray icon when unread mentions exist
- Double-click tray icon: bring Veyra window to front

**Native Notification (OS toast, not web notification):**
- Veyra logo left (icon)
- Sender name bold
- Message preview (1–2 lines)
- Action buttons: Reply (opens Veyra to that DM/channel), Mark as Read

**Auto-Update Dialog (Tauri updater):**
- Modal overlaid on current app view (not a new OS window)
- "A new version of Veyra is available" heading
- Version number and brief changelog notes
- "Update Now" (accent violet) and "Remind Me Later" (ghost) buttons
- Download progress bar shows while updating, "Relaunch to finish" final state

**Push-to-Talk Indicator (floating, desktop only):**
- Small pill-shaped floating overlay anchored bottom-center of app window
- Shows only when in a voice channel
- Contents: current keybind label + mic status icon + teal "LIVE" indicator when transmitting
- When muted: pill shows red mic icon + "Muted" label

---

### Screen 12 — Mobile / PWA Layout

**Veyra** wordmark shown in the top header of the mobile home screen.

**Bottom Tab Navigation:**
- 5 tabs: Home (DMs icon), Servers (grid icon), Search (magnifier), Notifications (bell + badge), Profile (avatar)
- Active tab: accent violet filled icon, violet underline indicator
- Inactive: muted icon
- Tab bar background: `#13131A`, top `#2A2A35` 1px border

**Server View (Mobile):**
- Channel list is the default view for a server (no persistent server rail visible)
- Swipe right → reveals server rail (70vw overlay, `#0F0F13` background, tap outside to dismiss)
- Swipe left from chat view → reveals member list (60vw overlay from right)
- Top bar: hamburger menu (opens server rail), channel name, members icon

**Chat View (Mobile):**
- Full-height message area
- Message input fixed at bottom with soft keyboard aware bottom inset
- Attachment, emoji, send button in input bar

**Voice Channel (Mobile):**
- Participant grid fills screen
- Persistent control bar fixed at bottom above tab bar (same controls as desktop voice bar)
- When in voice channel and navigating away: minimized voice pip banner appears just above tab bar (shows channel name, muted status, end call button)

**Design Notes:** Minimum tap target 44×44px. Font one size larger than desktop equivalents. Generous padding. Swipe gestures annotated with directional arrows in the design spec.

---

## 11. Build Phases

**Phase 1 — Design System + Shell**
Design all screens in Google Stitch. Define component library in Tailwind. Build Tauri shell with custom chrome. Set up Turborepo monorepo.

**Phase 2 — Auth + Navigation**
Auth.js integration. Login, register, onboarding flows. Main shell (server rail, channel sidebar, content area). Routing with Next.js App Router.

**Phase 3 — Messaging**
Real-time text messaging via WebSocket + Upstash Redis pub/sub. Message composer, reactions, replies, embeds. Server and channel creation.

**Phase 4 — Voice & Video**
LiveKit SFU integration. Voice channels, 1:1 video calls, group video, screen share, stage channels. Push-to-talk via Tauri global shortcuts. Noise suppression via RNNoise.

**Phase 5 — Desktop Polish**
Tauri system tray, native notifications, auto-updater, offline message cache (SQLite), deep links, file drag-drop.

**Phase 6 — Mobile PWA**
Responsive layout for mobile breakpoints. Service worker + Web Push. Offline caching via IndexedDB. Add-to-home-screen manifest.

**Phase 7 — Advanced Features**
Semantic search (pgvector), Kanban channels, sandboxed code preview, E2E encrypted DMs, AI-powered server moderation.

---

## 12. Friend System Implementation Addendum

### Data Models

- `friend_requests`
  - `sender_id`, `receiver_id`
  - `status`: `pending | accepted | declined | canceled`
  - `created_at`, `updated_at`, `responded_at`
  - unique composite: `(sender_id, receiver_id)`
- `friends`
  - directional rows for each accepted relationship (`A -> B` and `B -> A`)
  - unique composite: `(user_id, friend_id)`
- `user_blocks`
  - `blocker_id`, `blocked_id`
  - unique composite: `(blocker_id, blocked_id)`

### API Contract

- `GET /friends`
  - returns `friends`, `pendingIncoming`, `pendingOutgoing`, and `blocked`
- `GET /friends/search?query=...`
  - searches users by **username or email**
  - returns relationship status (`none`, `friends`, `incoming_request`, `outgoing_request`, `blocked_by_you`, `blocked_you`)
- `POST /friends/requests`
  - send request by username/email
  - auto-accepts if reverse pending request exists
- `POST /friends/requests/:id/accept`
- `POST /friends/requests/:id/decline`
- `DELETE /friends/requests/:id` (cancel outgoing pending request)
- `DELETE /friends/:friendUserId` (remove friend)
- `POST /friends/block` and `DELETE /friends/block/:userId`

### Behavior Rules

- Users cannot friend themselves.
- Users cannot send friend requests when either side has blocked the other.
- Blocking a user removes any existing friendship and cancels pending requests both directions.
- Search input minimum: 2 characters.
- Search must support both exact and partial matches for email/username using case-insensitive comparison.
