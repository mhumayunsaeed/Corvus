# Corvus Codebase Audit Report

**Date:** 2026-06-16
**Scope:** Full monorepo audit (read-only). No files were modified to produce this report.

---

## 0. Executive Summary

The Corvus codebase is **substantially healthier than a typical "needs a deep cleanup" project**. The headline numbers up front, because they change the shape of the work:

| Metric | Result |
| --- | --- |
| `tsc --noEmit` errors (`apps/web`, `apps/api`, `packages/ui`) | **0 / 0 / 0** |
| ESLint errors in **hand-written** code | **0** (all 3,210 "errors" come from generated Prisma client — see §3.4) |
| ESLint warnings in hand-written code | ~36 (mostly `any` in API routes) |
| `debugger` statements | **0** |
| `TODO` / `FIXME` / `HACK` / `XXX` markers | **0** |
| Commented-out code blocks | **0** |
| Stray debug `console.log` in app logic | **0** (see §1.3) |
| Orphaned source files | **2** (437 LOC) |
| Test files | **0** (none exist anywhere) |

**The biggest single finding is structural, not janitorial:** the Phase-3 target directory structure prescribed in the task assumes a **Vite SPA with a heavy Rust/Tauri backend**. This repo is a **Next.js (App Router) monorepo with a thin 140-line Tauri shell that has zero commands**. Mechanically applying the prescribed structure would *break* Next.js routing and create empty backend folders. This needs a decision before Phase 3 — see **§2.1** and **§5**.

### Actual architecture

```
corvus/  (pnpm workspace + Turborepo)
├── apps/
│   ├── web/        Next.js 15 App Router — the actual UI (~10k LOC hand-written)
│   │               Also loaded by the desktop shell via URL.
│   ├── api/        Hono API server (Prisma + Supabase + LiveKit tokens)  (~6k LOC + 63k generated)
│   └── desktop/    Tauri 2 shell — ONE main.rs (window/tray mgmt). No commands.
├── packages/
│   ├── ui/         Shared UI primitives + theme (mostly unconsumed — see §1.2)
│   └── config/     Shared eslint/tailwind/tsconfig
└── supabase/       DB/edge config
```

Line counts (excluding `node_modules`, `.next`, `out`, `dist`, `target`):
- **~92,655** total TS/TSX lines, of which **~63,000 are generated Prisma client** (`apps/api/src/generated`).
- **~29,000** hand-written TS/TSX across 165 source files.
- **140** Rust lines (`main.rs` + `build.rs`).

---

## 1. Dead Code Detection

### 1.1 Orphaned files (imported nowhere) — HIGH confidence

Verified via import-graph scan (accounting for NodeNext `.js`-extension imports and Next.js framework-entry files):

| File | LOC | Notes |
| --- | --- | --- |
| `apps/web/data/mockData.ts` | 252 | Imported by **nothing**. The live UI uses `apps/web/components/app-v2/sample-data.ts` (which *is* used by `useShellData.ts`). |
| `apps/web/lib/supabase/realtime.ts` | 185 | Imported by **nothing**. `apps/web/lib/supabase/client.ts` *is* used (by `auth.ts`, `RoutedAppShell.tsx`); only the `realtime` helper is dead. Contains the lone web `eslint-disable` for `any`. |

**Total dead-file LOC: 437.** Both are safe deletions in Phase 2 after a final confirmation grep.

> Note: an earlier raw scan flagged 14 files in `apps/api/src` as orphans. These are **false positives** — the API imports with explicit `.js` extensions (NodeNext), e.g. `import auth from "./routes/auth.js"`. Every API file is referenced. Do **not** delete them.

### 1.2 Unused / duplicated UI components — MEDIUM confidence (needs a decision)

`packages/ui` exports 20 symbols (18 components + `cn` + motion helpers). Across the entire repo, **`apps/web` consumes only**:

- `cn` (35 files) — the class-merge helper
- `Titlebar` (1 file — `app/layout.tsx`)
- `ThemeProvider`, `ThemeScript`, `useTheme`, `ThemePreference` (theme system)

The remaining **~14 `packages/ui` components are consumed by nothing in this repo**: `avatar`, `badge`, `button`, `dialog`, `dropdown-menu`, `icon-button`, `input`, `kbd`, `modal`, `popover`, `skeleton`, `spinner`, `surface`, `switch`, `tabs`, `tooltip`.

Meanwhile `apps/web/components/ui/` defines its **own** parallel set (`Avatar`, `Button`, `Input`, `Modal`, `Toast`, `Toggle`, `ChannelGlyph`) and the app uses those. So there is genuine **duplication** (`packages/ui/avatar` vs `web/components/ui/Avatar`, `modal` vs `Modal`, `button` vs `Button`, `input` vs `Input`).

**Decision required** (do NOT auto-delete): `packages/ui` is a *library* package and may be intentionally broader than current consumption (future/external use). Options: (a) slim `packages/ui` to what's consumed, (b) migrate `apps/web` onto `packages/ui` and delete the local duplicates, or (c) leave as-is and document intent. Flagged in §5.

### 1.3 `console.*` statements

42 total occurrences. Categorized:

| Category | Count | Recommendation |
| --- | --- | --- |
| Build/tooling scripts (`apps/desktop/generate-icons.*`, `make_nsis_assets.js`) | 16 | **Keep** — legitimate CLI output, and already eslint-ignored. |
| API startup banner (`apps/api/src/index.ts`) | 9 | **Keep** — intentional boot log. |
| Legitimate `console.error` / `console.warn` error handling (auth-store, notifications, realtime, servers, app.ts error handler, updater route) | 16 | **Keep as-is.** There is no logger abstraction in the repo; these *are* the logging. Optional: introduce a tiny `logger` wrapper (out of scope unless requested). |
| **Stray debug `console.log` in app logic** | **0** | Nothing to remove. |

⚠️ **Do NOT touch** `apps/web/app/developers/[slug]/page.tsx:111`. It looks like `console.log(...)` but is a **string literal of example code displayed on a developer-docs page** — not a real call.

### 1.4 `debugger`, TODO/FIXME/HACK/XXX, commented-out code

- `debugger`: **0**
- `TODO` / `FIXME` / `HACK` / `XXX`: **0**
- Commented-out code blocks (heuristic for `//` + code tokens): **0**

This codebase has no debug cruft.

### 1.5 `any` types — 29 occurrences (typeable)

| File | Count | Context |
| --- | --- | --- |
| `apps/api/src/routes/friends.ts` | 15 | Prisma row shaping / response mapping |
| `apps/api/src/routes/dms.ts` | 8 | ditto |
| `apps/api/src/routes/messages.ts` | 3 | ditto |
| `apps/web/lib/supabase/realtime.ts` | 1 | (file is an orphan — will be deleted) |
| `apps/web/lib/auth.ts` | 1 | |
| `apps/web/lib/notifications.ts` | 1 | |
| `apps/api/src/routes/auth.ts` | 1 | |
| `apps/api/src/lib/supabase.ts` | 1 | |

Most are in API route handlers mapping Prisma/Supabase results. They are typeable using the generated Prisma types and Zod schemas already present. 5 `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments accompany some of these.

### 1.6 Unused exports — NOT fully enumerated (tooling gap)

A complete unused-export sweep needs `knip` or `ts-prune`, **neither of which is installed**, and the task says not to add dependencies. High-confidence candidates found by grep are limited to the orphan files in §1.1. A thorough export-level sweep is recommended as a follow-up with `knip` (flagged in §5). One concrete lint hit: unused `err` binding at `apps/web/lib/auth.ts:271`.

---

## 2. Structure Audit

### 2.1 ⚠️ Prescribed Phase-3 structure does not fit this stack

The task's target layout (`src/app`, `src/features/*`, `src-tauri/src/commands|services|models|db|crypto|error.rs`) is designed for a **Vite SPA + substantial Rust backend**. Reality:

1. **`apps/web` is Next.js App Router.** The `app/` directory *is* the router — folder structure maps to URLs. Moving routes into `src/features/messaging/components/` would **break routing** and is non-idiomatic for Next.js. The Next.js-correct analog of "feature slices" is colocating non-route code (components/hooks/stores/api) per domain *outside* `app/`, which this repo already partially does (`components/app-v2`, `stores/`, `lib/`).
2. **`apps/desktop/src-tauri` has ZERO Tauri commands.** `main.rs` only does window/tray/plugin setup; the desktop app just loads the web URL. There is no business logic, no `db`, no `crypto`, no `models` in Rust to split into `commands/`, `services/`, etc. Creating those folders would leave them empty.
3. **No inline crypto / no `services/crypto` need.** Web crypto usage is 2 references (Web Crypto API in noise handling). LiveKit tokens are minted server-side in `apps/api/src/lib/livekit.ts`. There is no client-side encryption layer to extract.

**Recommendation:** Adapt Phase 3 to the real stack (see §5 for a concrete proposal) and get sign-off before moving files.

### 2.2 God files (single-responsibility violations)

Largest hand-written files (excluding generated):

| File | LOC | Assessment |
| --- | --- | --- |
| `apps/web/components/app-v2/AppShell.tsx` | **1,489** | **Primary refactor target.** Orchestrates ~20 child views, 5 Zustand stores, and ~12 API calls; mixes layout, routing-ish view switching, call session state, and dialog state. Candidate to split into hooks (`useCallSession`, `useDialogs`, `useViewRouting`) + a slimmer shell. |
| `apps/web/lib/api.ts` | 1,058 | Single flat API client for *all* domains. Reasonable to split into per-domain clients (`api/messages.ts`, `api/friends.ts`, …) but it's cohesive and already the correct layer. Medium priority. |
| `apps/api/src/docs.ts` | 1,023 | API docs/OpenAPI content. Data-heavy; low risk; could be split by section. |
| `apps/api/src/routes/dms.ts` | 955 | Large route module; could extract handlers/services. |
| `apps/web/components/app-v2/UserSettings.tsx` | 833 | Large settings component; splittable by tab/section. |
| `apps/web/components/app-v2/BoardView.tsx` | 803 | Feature view; large but cohesive. |
| `apps/web/components/app-v2/CanvasView.tsx` | 759 | ditto |
| `apps/api/src/routes/messages.ts` | 668 | Large route module. |
| `apps/api/src/routes/friends.ts` | 644 | Large route module (+ 15 `any`). |

### 2.3 Layering — already mostly clean

- **API calls are abstracted.** Components import typed functions from `lib/api.ts` (e.g. `createChannel as createChannelApi`). Only **2** components issue raw `fetch` (`auth/AuthShell.tsx`, `app-v2/Pickers.tsx`) and **1** uses Supabase directly (`app-v2/RoutedAppShell.tsx`, for session). These are minor and defensible.
- **State is in Zustand stores** (`stores/`), not scattered in components.
- **No direct Tauri `invoke()` sprawl** — Tauri plugin access is via dynamic `import()` in `lib/notifications.ts` etc. (3 references total).

The main layering improvement available is extracting orchestration logic out of `AppShell.tsx` into hooks.

### 2.4 Missing abstraction layers

- **No logger** — error logging is raw `console.error`. Optional `shared/logger`.
- **No centralized shared types** — domain types live in `apps/web/components/app-v2/types.ts`. Fine for a single consumer; revisit only if shared more widely.
- **No tests / no test harness** — 0 test files. Out of scope to author, but flagged: Phase 5's "run all existing tests" has nothing to run.

---

## 3. Dependency Audit

### 3.1 `apps/web` — candidate-unused dependencies

| Package | Status | Confidence |
| --- | --- | --- |
| `livekit-client` | No import anywhere in web; calls UI uses raw WebRTC/`getUserMedia`. LiveKit is used **server-side only** (`apps/api`). | High — likely removable |
| `@livekit/components-react` | Not imported in web. | High |
| `@livekit/components-styles` | Not imported in web. | High |
| `date-fns` | No references in web source. | High |
| `framer-motion` | No references in `apps/web` (it **is** used in `packages/ui`). Unused as a *direct* web dep. | Medium |
| `@shiguredo/rnnoise-wasm` | `lib/noise-suppression.ts` uses native Web Audio, not rnnoise. | Medium — verify no runtime wasm load |
| `@tauri-apps/plugin-*` (deep-link, dialog, fs, global-shortcut, os, process, sql, store, updater) | **Not imported in TS** (only `plugin-notification` is, via dynamic import). | ⚠️ Low — the corresponding **Rust** plugins *are* registered in `main.rs`, so features may work without the JS wrapper. **Verify per-plugin before removing.** |

> All of the above are **flagged, not removed**. Removing deps doesn't change behavior *only if* they're truly unreferenced at runtime (incl. dynamic imports and wasm). Recommend confirming `livekit-*`, `date-fns`, `framer-motion`, `@shiguredo/rnnoise-wasm` first as the safe set.

### 3.2 `apps/api` — all dependencies used ✅

`@hono/node-server`, `@node-rs/argon2`, `@prisma/client`, `@supabase/supabase-js`, `dotenv`, `hono`, `jose`, `livekit-server-sdk`, `node-html-parser`, `zod` — each imported in ≥1 file. No unused API deps.

### 3.3 Rust (`Cargo.toml`)

- All `tauri-plugin-*` crates are **registered** in `main.rs` (lines 125–134) → used.
- `serde`, `serde_json` — **no usage in `main.rs`** (no derives, no `serde_json::` calls). Candidate-unused direct deps. Harmless to keep; `cargo check` won't flag them. Confirm with `cargo +nightly udeps` if removal is desired. Low priority.
- No deprecated crates observed.

### 3.4 Tooling config gap

`eslint.config.mjs` ignores `**/gen/**` but **not** `**/generated/**`, so the 63k-line generated Prisma client is being linted — the source of all 3,210 "errors". **Fix:** add `**/generated/**` (or `apps/api/src/generated/**`) to the ignore list. This is a one-line, zero-risk, high-value change.

---

## 4. What is genuinely actionable (Phase 2 scope)

Safe, behavior-preserving, high-confidence cleanup:

1. Add `**/generated/**` to ESLint ignores (§3.4) — eliminates 3,210 phantom errors.
2. Delete 2 orphan files (§1.1) — `data/mockData.ts`, `lib/supabase/realtime.ts` (437 LOC) after a final confirm-grep.
3. Type the 28 live `any`s (orphan-file `any` disappears with deletion) in API routes using existing Prisma/Zod types (§1.5); remove the now-needless `eslint-disable` comments.
4. Remove unused `err` binding at `auth.ts:271`; resolve `no-useless-catch` (`auth-store.ts:268`) and `no-useless-escape` (`unfurl.ts:5`).
5. Remove the safe-set unused web deps after confirmation: `livekit-client`, `@livekit/components-react`, `@livekit/components-styles`, `date-fns` (§3.1).

What is **NOT** needed (despite being in the task template): removing `console.log` debug (none exist), removing `debugger`/TODO/commented code (none exist), deleting "unused functions" beyond the orphan files (none confirmed without `knip`).

---

## 5. Items requiring a human decision (`// REVIEW:`)

1. **Phase 3 structure.** The prescribed `src/features/*` + `src-tauri/commands|services|models|db|crypto` layout conflicts with Next.js App Router and an empty Tauri backend. **Proposed adaptation:**
   - `apps/web`: keep `app/` as the router; consolidate domain code under `apps/web/features/<domain>/{components,hooks,store,api,types.ts,index.ts}` and `apps/web/shared/{components,hooks,utils,types,constants}`, moving the current `components/app-v2/*`, `stores/*`, and `lib/*` into those slices with barrel exports. Routes in `app/` import only from feature barrels.
   - `apps/api`: already close to ideal (`routes/`, `lib/`, `services/`, `repositories/`, `middleware/`). Minor: rename `lib/` → split into `services/` vs `lib/` (pure helpers); add a unified `error.ts`.
   - `apps/desktop`: leave `main.rs` as-is (optionally split window vs tray setup into modules) — there are no commands to modularize.
   - **Confirm before moving any files.**
2. **`packages/ui` duplication** (§1.2): slim to consumed surface, migrate web onto it, or document as intentional library breadth?
3. **Unused-dep removal scope** (§3.1): confirm the safe set, and decide whether to investigate the `@tauri-apps/plugin-*` JS wrappers individually.
4. **Tests**: none exist. Author a baseline harness, or accept Phase 5 verification = build + typecheck + lint + clippy only?
5. **God-file refactors** (§2.2): `AppShell.tsx` (1,489 LOC) is the clear target; confirm appetite for behavior-preserving extraction into hooks.

---

## 6. Verification baseline (pre-change)

For Phase 5 comparison, current state on `master`:

- `apps/api`: `tsc --noEmit` → **0 errors** ✅
- `apps/web`: `tsc --noEmit` → **0 errors** ✅
- `packages/ui`: `tsc --noEmit` → **0 errors** ✅
- ESLint (hand-written code): **0 errors**, ~36 warnings ✅ (3,210 generated-file errors to be excluded via §3.4)
- `cargo check` / `cargo clippy`: not yet run (Rust unchanged this audit); will be part of Phase 5.
- Tests: none exist.

The codebase compiles cleanly today. Cleanup should keep it that way at every step.
