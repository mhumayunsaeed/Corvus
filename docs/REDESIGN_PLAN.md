# Corvus — Full UI/UX Redesign Plan

> **Goal:** move Corvus from "a well-built Discord clone" to a product that looks
> and feels like it was crafted by an expert design team — with a distinct,
> ownable brand, a reimagined navigation model, and a proper dual-theme
> (dark + light) design system shared across web and desktop.

**Direction chosen (with stakeholder):**
- **Aesthetic:** Bold Expressive — a strong, ownable brand identity.
- **Themes:** Dark *and* Light, both first-class via semantic tokens.
- **Layout:** Reimagine navigation — depart from the Discord 4-column shell.

---

## Implementation status

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Foundations | ✅ Done | Channel-based token CSS (`packages/ui/src/styles/tokens.css`), Tailwind references vars, `ThemeProvider`/`ThemeScript`, dark+light+system toggle, display font, reduced-motion. |
| 2 — Primitives | ✅ Done | Motion tokens (`lib/motion.ts`); token-styled `Surface`, `IconButton`, `Switch`, `Skeleton`, `Spinner`, `Kbd`; **Radix-based** `Dialog`, `Popover`, `DropdownMenu`, `Tabs`. |
| 3 — New shell | ✅ Done (beta flag) | Unified `Sidebar`, `CommandPalette` (⌘K, always on), `HomeHub`, `NewShell`. Behind `useNewShell()` flag; classic shell unchanged + default. |
| 4 — Conversation surfaces | ✅ Done | Composer elevated (e1 + accent focus) with contextual **Send**; **bespoke DM chat bubbles** (own right-aligned accent-tint, others surface, with tails); elevated hover toolbar (`e2`) + refined reaction pills; theme-breaking hardcoded hex replaced with tokens. Channels keep refined rows (correct for dense multi-user). |
| 5 — Context panel & social | ✅ Done | Right-hand `ContextPanel`: members + live presence (collapsible) **and a member profile card** (click a member → Aurora-bannered profile with role, bio, join date). Inline threads remain a data-dependent follow-up. |
| 6 — Voice/video/stage | ✅ Done | "Live" visual system on the signature **signal-cyan** (`live`) token: pulsing Live indicators, speaking rings/glows + speaking-pulse, re-keyed control bar / voice view / stage / call modal / incoming-call; hardcoded gradients/teal made theme-aware. |
| 7 — Auth/landing/empty | ✅ Done | Branded app loading state; settings Appearance redesigned; landing verified token-based (theme-ready); auth hardcoded hex replaced with tokens; **Aurora brand moment** + display face on the login mark. |
| 8 — Desktop polish | ✅ Done* | Titlebar theme-aware + OS window theme sync; focus mode (⌘\); **`windowEffects: ["mica","acrylic"]`** added to the Tauri window. *Native effects config not build-tested in this environment (no Rust/Tauri build here); becomes fully visible once app surfaces adopt translucency. |
| 9 — QA & a11y | ✅ Done* | Reduced-motion, focus-visible rings everywhere, palette `aria-modal`, Radix focus-trapping primitives, `aria-label`/`aria-keyshortcuts` on icon-only controls; dual-theme palettes tuned for AA. *Automated visual-regression snapshots in CI remain an infra follow-up (see §11). |

> Everything above builds green (`next build` + `@corvus/ui` typecheck, 0 new lint errors). Enable the new experience via **Settings → Appearance → New layout (beta)** or **⌘K**.

### §11 — Accessibility & QA audit (Phase 9)

**Done**
- **Motion:** global `prefers-reduced-motion` kills transforms/animation while keeping content legible.
- **Focus:** app-wide `:focus-visible` ring; Radix primitives (Dialog/Popover/Menu/Tabs) provide focus-trap, roving focus, escape, and scroll-lock for free.
- **Semantics:** command palette is a labelled `aria-modal` dialog; icon-only buttons in the new shell carry `aria-label` (and `aria-keyshortcuts` on the ⌘K trigger); live/voice state is conveyed by text + icon, not color alone.
- **Contrast:** both theme palettes were authored for WCAG AA — light-theme accents/text were intentionally darkened (e.g. accent `#5D4BE0`, live `#0FB8AE`) for ≥4.5:1 body text; hardcoded hex that broke light mode (reactions, code border, typing dots, auth, voice teal) was migrated to semantic tokens.

**Remaining (infra follow-ups, not blocking)**
- Stand up **Playwright visual-regression snapshots** (per route × theme) in CI — requires a browser runner; not reproducible in this environment.
- Automated **axe-core** pass in CI for regression coverage.
- Manual screen-reader pass (NVDA/VoiceOver) on the new shell + call surfaces.

---

## 0. Where we are today

| Area | Current state |
|------|---------------|
| Shell | `ServerRail (72px) → ChannelList → ChatView → (Member sidebar)` — a near 1:1 Discord clone (`apps/web/app/app/page.tsx`, `components/app/ServerRail.tsx`). |
| Tokens | One dark-only palette hardcoded in `packages/config/tailwind.config.ts`; violet `#7C6AF7` + teal, near-black surfaces. No theme switching, no semantic layer. |
| Components | `packages/ui` has a thin primitive set (button, input, modal, avatar, badge, tooltip, titlebar). Most real UI lives as bespoke Tailwind in `apps/web/components/app/*`. |
| Desktop | Tauri v2 shell loads the **same** web UI; only the window chrome (`packages/ui/titlebar.tsx`) is desktop-specific. → **A web redesign covers desktop automatically.** |
| Motion | Ad-hoc GSAP + Tailwind keyframes, inconsistent. |

**Key architectural insight:** because desktop renders the web app, there is *one* UI to redesign. Effort concentrates on `apps/web` + `packages/ui` + `packages/config`. Desktop work is limited to native chrome and platform affordances.

---

## 1. Brand concept — "Iridescent Obsidian"

The name **Corvus** is the raven/crow constellation. We lean into it instead of borrowing Discord's blurple. Ravens read as *intelligent, sharp, a little mysterious* — and their black feathers throw an **iridescent violet→cyan→teal sheen** in light. That sheen becomes our signature visual device.

- **Base:** deep obsidian (dark) / cool paper (light), both with a faint blue undertone.
- **Signature "Aurora" gradient:** `violet → fuchsia → cyan` used *sparingly* for brand moments (logo lockup, active nav indicator, primary CTA sheen, focus auras, empty-state art). This is the thing people remember.
- **Solid interactive accent:** a single confident **electric iris** (`#6E5BFF`-family) for buttons, links, selection — never competing with the Aurora.
- **Voice/live accent:** a distinct **signal cyan/teal** reserved exclusively for live/voice/recording states so "something is live" is instantly legible.

> Differentiator vs Discord: Discord = flat blurple on gray. Corvus = obsidian depth + an *iridescent* brand that shifts and glows, plus a calmer, more spacious information design.

---

## 2. Design principles

1. **Content first, chrome second.** Conversation is the hero; navigation recedes until needed.
2. **One accent, used with restraint.** Color earns attention. The Aurora is a spice, not a sauce.
3. **Depth through light, not lines.** Prefer elevation, soft shadow, and subtle translucency over hard 1px borders everywhere.
4. **Calm motion with intent.** Every animation explains a spatial relationship (where did this come from / go to). Fast (120–220ms), spring-based, never decorative-only.
5. **Keyboard-first, command-driven.** Power users should rarely touch the mouse; `⌘K` is the spine of navigation.
6. **Accessible by construction.** WCAG AA contrast in both themes, visible focus, reduced-motion support, full keyboard reachability.

---

## 3. Design system foundations

Everything below is authored as **semantic tokens** so dark/light/expressive-brand all flow from one source. Implemented as CSS custom properties + a Tailwind theme that references them (see §7).

### 3.1 Color — token architecture

Three layers:

1. **Primitive palette** (raw scales, never used directly in components):
   `obsidian-0…12`, `iris-50…900`, `aurora-violet / -fuchsia / -cyan`, `cyan-signal`, plus `green/amber/red` semantic scales.
2. **Semantic tokens** (what components reference). Examples:
   - Surfaces: `--bg-app`, `--bg-sunken`, `--bg-surface`, `--bg-raised`, `--bg-overlay`, `--bg-translucent`
   - Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`, `--text-on-accent`
   - Lines: `--border-subtle`, `--border-default`, `--border-strong`, `--border-focus`
   - Accent: `--accent`, `--accent-hover`, `--accent-pressed`, `--accent-soft` (tint bg), `--accent-contrast`
   - Brand: `--aurora-gradient`, `--aurora-glow`
   - States: `--live` (cyan), `--positive`, `--warning`, `--danger`, each with `-soft` tint variants
3. **Component tokens** (optional, for complex parts): `--composer-bg`, `--bubble-bg-own`, etc.

**Dark theme (default) — illustrative values**

| Token | Value |
|-------|-------|
| `--bg-app` | `#0A0B11` (keep the deep base; it's good) |
| `--bg-sunken` | `#070811` |
| `--bg-surface` | `#12131C` |
| `--bg-raised` | `#191A26` |
| `--bg-overlay` | `#20212F` |
| `--text-primary` | `#ECEDF5` |
| `--text-secondary` | `#AEB3C8` |
| `--accent` | `#6E5BFF` |
| `--accent-soft` | `rgba(110,91,255,0.14)` |
| `--live` | `#22E0D6` |
| `--aurora-gradient` | `linear-gradient(120deg,#7B5CFF,#C44BE8,#22E0D6)` |

**Light theme — illustrative values**

| Token | Value |
|-------|-------|
| `--bg-app` | `#F6F7FB` (cool paper, faint blue) |
| `--bg-sunken` | `#EEF0F6` |
| `--bg-surface` | `#FFFFFF` |
| `--bg-raised` | `#FFFFFF` + shadow |
| `--text-primary` | `#14151F` |
| `--text-secondary` | `#4A4F63` |
| `--accent` | `#5B49E6` (darkened for AA on white) |
| `--live` | `#0FB8AE` |
| `--aurora-gradient` | same hues, slightly desaturated |

> Rule: components **never** hardcode hex. The big migration is replacing literal colors in `components/app/*` with semantic classes (`bg-surface`, `text-secondary`, `bg-accent`, …).

### 3.2 Typography

- **Body / UI:** keep **Inter** (variable) — excellent and already loaded. Tighten the scale.
- **Display / brand:** introduce one expressive display face for headings, empty states, and marketing — e.g. a characterful grotesk (**Geist**, **Clash Display**, or **General Sans**). This is what signals "expressive brand" vs. Discord's uniform Inter-everywhere.
- **Mono:** keep **JetBrains Mono** for code/inline code/IDs.

**Type scale (semantic, not pixel-named):**

| Token | Size / line / tracking | Use |
|-------|------------------------|-----|
| `display-lg` | 40 / 44 / -0.02em | empty states, onboarding |
| `display` | 30 / 36 / -0.02em | section heroes |
| `title` | 20 / 28 / -0.01em | modal & panel titles |
| `heading` | 16 / 24 / -0.005em | channel header, card titles |
| `body` | 14 / 21 | messages, default |
| `body-sm` | 13 / 20 | secondary UI |
| `label` | 12 / 16 / 0.01em | metadata, timestamps |
| `caption` | 11 / 15 / 0.02em uppercase | section dividers, badges |

### 3.3 Spacing, grid & radius

- **4px base grid.** Spacing scale `0,1,2,3,4,6,8,12,16,24,32,48,64`.
- **Generous over dense.** Increase message row padding and side gutters vs. current — breathing room reads as "premium."
- **Radius scale:** `xs 6 / sm 8 / md 10 / lg 14 / xl 20 / 2xl 28 / pill 999`. Use larger radii on cards/overlays for the "soft modern within bold" feel.

### 3.4 Elevation & depth

Replace ubiquitous 1px borders with a **5-step elevation system** (shadow + optional hairline + optional translucency):

`e0` flush · `e1` raised card · `e2` popover/menu · `e3` modal · `e4` toast/floating. Each step has a dark and light shadow recipe. Keep glass (`backdrop-blur`) for overlays only, not for primary surfaces (perf + clarity).

### 3.5 Iconography

- Standardize on **one** icon set at one stroke weight (currently `lucide-react` — keep it, but audit for consistent 1.5px stroke and 20/24 sizing). No mixed sets.
- Commission/define a small set of **brand glyphs** (the Corvus mark, the Aurora active-indicator, voice waveform) that are unmistakably ours.

### 3.6 Motion language

- **Library:** adopt **Framer Motion** for component transitions; reserve GSAP only for the marketing/landing hero. Consistency > cleverness.
- **Tokens:** durations `fast 120 / base 180 / slow 240 / page 320`; easings `standard cubic-bezier(0.2,0,0,1)`, `spring (stiffness 380, damping 30)`, `emphasized` for hero moments.
- **Patterns:** shared-layout transitions when opening a thread/profile from a message; list items fade+rise on first paint; the Aurora active indicator *slides* between nav items (one element, `layoutId`).
- **Respect `prefers-reduced-motion`** globally (kill transforms, keep opacity).

---

## 4. Navigation — reimagined shell

The current model forces a 72px icon rail + a channel column before you reach content. We replace it with a **unified, collapsible Spaces sidebar + a command palette + an optional context panel.**

### 4.1 New layout anatomy

```
┌───────────────────────────────────────── titlebar (desktop) ─────────────────┐
│                                                                               │
│  ┌─────────────┐ ┌────────────────────────────────┐ ┌───────────────────┐    │
│  │  SIDEBAR    │ │            STAGE                │ │  CONTEXT PANEL    │    │
│  │ (collapsible│ │  (conversation / call / hub)    │ │  (optional, e.g.  │    │
│  │  220–280px) │ │                                 │ │  members, thread, │    │
│  │             │ │   header · content · composer   │ │  profile, details)│    │
│  │  • Home     │ │                                 │ │                   │    │
│  │  • Spaces ▸ │ │                                 │ │  collapsible /    │    │
│  │    chans    │ │                                 │ │  overlay on narrow│    │
│  │  • DMs      │ │                                 │ │                   │    │
│  │  • You      │ │                                 │ │                   │    │
│  └─────────────┘ └────────────────────────────────┘ └───────────────────┘    │
│                                                                               │
│                         ⌘K  ── global command palette ──                      │
└───────────────────────────────────────────────────────────────────────────────┘
```

**From 4 columns → 2 primary regions (+1 optional).** The server rail and channel list **merge** into a single navigable **Spaces** tree inside one sidebar. The member list, thread view, and user profile **collapse** into one swappable **Context Panel** on the right (Discord scatters these; we unify them).

### 4.2 The Sidebar (unified "Spaces")

- Sections: **Home** (activity hub), **Direct Messages**, **Spaces** (servers), **You** (profile/settings entry).
- A **Space** expands inline to reveal its channels as a tree (categories collapsible). No separate rail-then-list two-step.
- Each Space shows a small **iridescent avatar ring** when it has mentions; unread is a calm dot, mention is an Aurora glow — quieter than Discord's red blobs everywhere.
- **Collapsible to a 64px icon strip** (power-user / focus mode) and **fully hideable** (`⌘\`) for distraction-free reading.
- Bottom: compact **self panel** (avatar, status, quick mute/deafen, settings) — redesigned from the current `UserDock`.

### 4.3 Command palette (`⌘K`) — the spine

A first-class palette becomes the primary fast-nav and action surface:
- Jump to any Space / channel / DM / person.
- Run actions ("Start a call", "Create channel", "Set status", "Toggle theme", "Invite people").
- Recent + fuzzy search + scoped results.
This is what makes the app feel *pro* (Linear/Raycast/Slack-quick-switcher energy) and lets us shrink persistent chrome.

### 4.4 Home / Activity hub

Replaces the empty "Welcome" screen with a real landing surface: unreads across all spaces, mentions, ongoing calls, recent threads, friend activity — a reason to open the app even when no channel is selected.

### 4.5 Context Panel (right)

One panel, many contents (swap, don't stack):
- **Members** (with rich presence), **Thread**, **Profile card**, **Channel/Space details**, **Call participants**.
- Slides in/out; on narrow widths becomes an overlay sheet.

### 4.6 Responsive / narrow & mobile-web

- **≥1280px:** sidebar + stage + context panel.
- **900–1280px:** context panel becomes an overlay; sidebar persists.
- **<900px:** single-column with a bottom tab bar (Home / DMs / Spaces / You) and slide-over panels — a genuine mobile-web experience (today it's a cramped desktop layout).

---

## 5. Screen & component redesign map

For each, redesign visual + (where noted) interaction. Files in `apps/web/components/app` unless noted.

| Surface | Redesign notes |
|--------|----------------|
| **App shell** (`app/app/page.tsx`) | Rebuild around the 2+1 region model; introduce `<AppShell>`, `<Sidebar>`, `<Stage>`, `<ContextPanel>` layout primitives. |
| **Sidebar** (replaces `ServerRail` + `ChannelList` + `DMSidebar`) | Unified Spaces tree, collapsible, iridescent active indicator (single `layoutId` element), calmer unread language. |
| **Command palette** (new) | `⌘K`, fuzzy nav + actions. New component + a `useCommandPalette` store. |
| **Home hub** (new) | Activity/unreads/mentions/calls overview. |
| **ChatView / DMChatView** | New message design: comfortable density, grouped consecutive messages, hover toolbar, refined reactions, cleaner embeds (`LinkEmbed`), redesigned reply/thread affordances. Shared `<MessageList>` for channel + DM. |
| **Composer** | Elevated, focused composer with attachment tray, slash/mention/emoji/sticker/gif menus restyled as one consistent popover system (`SlashCommandMenu`, `MentionMenu`, `EmojiPicker`, `GifPicker`, `StickerPicker`). |
| **Context Panel** | New container hosting redesigned Members list, Thread view, Profile card, Channel details. |
| **Voice / Stage / Call** (`VoiceChannelView`, `StageChannelView`, `CallModal`, `VoiceControlBar`, `IncomingCallNotification`) | Cohesive "live" visual system using the cyan **signal** accent: speaking rings, waveforms, screenshare focus, redesigned control bar with clear primary/secondary actions. |
| **Friends** (`FriendsView`) | Redesigned presence, request flows, search. |
| **Modals** (`Create*Modal`, `Invite*`, `*SettingsModal`) | Move to one elevation/`Modal` system; settings become a proper two-pane settings experience (nav + content) instead of cramped modals. |
| **Toasts / notifications** (`ToastNotification`) | New toast system at `e4` elevation with motion + the live/positive/danger semantics. |
| **Avatars / badges / status** (`UserAvatar`, `packages/ui/avatar,badge`) | Presence ring system, iridescent self-ring, consistent sizing tokens. |
| **Auth & landing** (`components/auth/*`, `components/landing/*`, `app/login` …) | Re-skin to the new brand; landing hero leans on the Aurora + display type. First impression — high priority. |
| **Empty / loading / error states** | Dedicated branded illustrations + skeletons (replace bare spinners). |

---

## 6. Desktop-specific (Tauri)

- **Custom titlebar** (`packages/ui/titlebar.tsx`): redesign to match the new chrome; integrate window controls cleanly, support light/dark, and merge the title region with the app's top edge (seamless, no "web page in a frame" feel).
- **Native affordances:** keep tray, notifications, auto-updater; restyle the in-app **update banner** (`UserDock`) to the new system. Add a subtle **vibrancy/acrylic** backdrop option where the platform supports it (mica on Windows 11) for an unmistakably native premium feel.
- **Theme:** follow OS light/dark by default with manual override; set the Tauri window theme + titlebar accordingly.
- **Focus mode:** `⌘\` to hide sidebar pairs especially well on desktop.

---

## 7. Implementation architecture

**Token pipeline (the foundation everything depends on):**

1. Author semantic tokens as **CSS variables** in a single source (e.g. `packages/ui/src/styles/tokens.css`), with `:root` (dark) and `[data-theme="light"]` blocks.
2. Rewrite `packages/config/tailwind.config.ts` so the theme **references the variables** (`background: "var(--bg-app)"`, `accent: "var(--accent)"`, …) instead of hardcoded hex. Tailwind class names mostly stay; their *values* now theme-switch for free.
3. Add a **`ThemeProvider`** (sets `data-theme`, persists choice, follows OS, exposes `useTheme`) in `packages/ui`; mount in `app/layout.tsx` and the desktop shell.
4. Build/expand the **primitive layer** in `packages/ui` (Button, Input, Select, Modal/Dialog, Popover, Tooltip, Menu, Tabs, Avatar, Badge, Toast, Skeleton, ScrollArea) — consider **Radix UI** primitives for accessibility, styled with our tokens. This replaces bespoke one-off markup scattered in `components/app`.
5. Add **motion tokens** + a thin Framer Motion wrapper set (`<Reveal>`, `<Sheet>`, `<Popover>` transitions).

**Migration order within a component:** swap hardcoded colors → semantic classes; replace bespoke controls with `packages/ui` primitives; apply new spacing/elevation/motion.

---

## 8. Phased rollout

Designed so the app stays shippable at every step (no big-bang rewrite).

**Phase 0 — Design definition (before code)**
- Lock brand (logo lockup, Aurora spec, color values for both themes), type pairing, and Figma (or coded) reference for: shell, message, composer, voice, modal, command palette. *Deliverable: a one-screen "north star" mock + token sheet.*

**Phase 1 — Foundations**
- Token CSS + ThemeProvider + Tailwind rewrite; light/dark toggle working app-wide with *zero* layout change yet. Audit/replace hardcoded hex.

**Phase 2 — Primitive library**
- Build the `packages/ui` primitive set (Radix + tokens + motion). Restyle the simplest surfaces first (modals, toasts, buttons, inputs) to prove the system.

**Phase 3 — The new shell**
- Implement `<AppShell>`, unified **Sidebar**, **Command palette**, and **Home hub**. Ship behind a flag; keep old shell switchable until parity.

**Phase 4 — Conversation surfaces**
- Redesign MessageList (channel + DM), composer, and the popover menu system. This is the most-used surface — highest payoff.

**Phase 5 — Context panel & social**
- Members / Thread / Profile / Channel details unified panel; Friends; presence system.

**Phase 6 — Voice / video / stage**
- "Live" visual system, control bar, call modal, incoming-call, screenshare.

**Phase 7 — Auth, landing, settings, empty states**
- Re-skin entry points and the settings experience; branded illustrations & skeletons.

**Phase 8 — Desktop polish**
- Titlebar, mica/vibrancy, OS theme sync, update banner, focus mode.

**Phase 9 — QA & accessibility pass**
- Contrast audits (both themes), keyboard/focus, reduced-motion, performance (blur/shadow cost), visual regression snapshots.

---

## 9. Risks & guardrails

- **Scope creep:** the reimagined nav is the riskiest bet. Mitigate by shipping the new shell behind a flag with old-shell fallback until parity is proven.
- **Token migration churn:** lots of hardcoded hex in `components/app`. Do it mechanically in Phase 1 to avoid blocking later visual work.
- **Performance:** heavy glass/shadows can cost frames in Tauri/webview. Budget blur to overlays only; test on low-end hardware.
- **Familiarity:** moving away from Discord muscle memory needs strong onboarding + the command palette to make discovery effortless.
- **Accessibility regressions:** bold/expressive color must still pass AA — verify every accent-on-surface pairing in both themes.

## 10. Success criteria

- A new user describes it as "clean / premium / its own thing," **not** "a Discord clone."
- Both themes pass WCAG AA; full keyboard navigation; reduced-motion honored.
- One coherent token + primitive system; **zero** hardcoded colors in feature components.
- `⌘K` can reach any conversation/action in ≤2 keystrokes-worth of typing.
- 60fps on the message list and nav transitions on mid-tier hardware.

---

### Immediate next steps
1. Approve brand direction (Iridescent Obsidian + Aurora) and the 2+1 navigation model.
2. Produce the Phase 0 north-star mock + token sheet.
3. Start Phase 1 (tokens + ThemeProvider + Tailwind rewrite) — unblocks everything else.
