# Migration Log

Running record of significant changes during the Neon→Supabase / Render→Vercel migration.
Newest entries at the top of each phase.

---

## Phase 1 — Audit & Score (complete)

- Full codebase audit performed. Overall score: **47/100**.
- Decisions confirmed with project owner:
  1. **Full move to Supabase Auth** (not just the DB) — Neon Auth is removed entirely.
  2. **Rewrite custom WebSocket layer → Supabase Realtime.**
  3. **Fix critical security issues now**, before the migration.

---

## Phase 1.5 — Critical security fixes (in progress)

### Tauri signing private key removed from version control
- **Files:** `apps/desktop/~/.tauri/veyra.key`, `apps/desktop/~/.tauri/veyra.key.pub`
- **What:** Removed from git tracking and deleted from the working tree. Added `*.key` and the
  stray `apps/desktop/~/` path to `.gitignore`.
- **⚠️ ACTION REQUIRED BY OWNER (cannot be done from here):**
  1. **Rotate the key.** The old key is in git history and must be considered compromised.
     Generate a new one: `pnpm tauri signer generate -w ~/.tauri/corvus.key`.
  2. **Purge from history** with `git filter-repo` (or BFG) and force-push:
     `git filter-repo --path apps/desktop/~/.tauri/veyra.key --path apps/desktop/~/.tauri/veyra.key.pub --invert-paths`
  3. Store the new private key + password only as CI secrets
     (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) and update the
     `pubkey` in `apps/desktop/src-tauri/tauri.conf.json`.

### API error-message leak patched
- **File:** `apps/api/src/index.ts`
- **What:** `app.onError` no longer returns the raw `err.message` to clients in production;
  it returns a generic message while still logging full details server-side.

---

## Phase 2 — Neon → Supabase (DB connection + Auth) (complete, code-level)

**Decision:** Keep Prisma as the ORM pointed at Supabase Postgres; replace Neon **Auth**
entirely with Supabase **Auth**. Data-access code (Prisma queries) is unchanged.

### Database
- No schema changes required — the Prisma schema is already standard PostgreSQL with no
  Neon-specific extensions, and already declares `directUrl`/`DIRECT_URL` (the recommended
  Supabase + Prisma setup: pooled `DATABASE_URL` for the app, direct `DIRECT_URL` for migrations).
- Migration to Supabase is a **connection-string swap** + running `prisma db push`/`migrate`
  against the Supabase project. (Owner must provide the Supabase connection strings.)

### Auth — API (`apps/api`)
- **Added** `src/lib/supabase.ts`: server-side Supabase admin client + `verifySupabaseToken()`
  (validates the Supabase access token via `auth.getUser`).
- **Deleted** `src/lib/neon-auth.ts`.
- **`src/routes/auth.ts`**: `/auth/session/exchange` now verifies a **Supabase** access token
  instead of a Neon JWT, then upserts the user and issues the app's own JWT (unchanged flow).
  Deprecated 410 stub messages reworded Neon → Supabase.
- **`src/index.ts`**: startup banner now reports Supabase config instead of Neon Auth/SMTP.
- **`package.json`**: added `@supabase/supabase-js`.

### Auth — Web (`apps/web`)
- **Added** `lib/supabase/client.ts`: browser Supabase client (PKCE, `detectSessionInUrl`).
- **Added** `lib/auth.ts`: Supabase auth helpers (`signInWithEmail`, `signUpWithEmail`,
  `signInWithGoogle`, `signOutSupabase`, `requestPasswordReset`, `updatePassword`,
  `resendVerificationEmail`, `getActiveSupabaseSession`, `exchangeSupabaseSession`,
  pending-signup-profile helpers).
- **Deleted** `lib/neon-auth.ts`.
- **Rewired** `stores/auth-store.ts` (login/register/googleLogin/restoreSession/logout).
- **Auth pages updated:** `forgot-password` (Supabase reset email), `reset-password`
  (now uses the Supabase **recovery session** from the email link rather than a `?token=`
  query param), `confirm-email` (resend via Supabase; token-verify branch removed since
  the confirmation link now lands on `/auth/callback`), `auth/callback` + `AuthGuard` copy.

### Env / deps / docs
- `apps/api/.env.example` and `apps/web/.env.example` rewritten for Supabase
  (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`); removed `NEON_AUTH_BASE_URL`,
  `NEXT_PUBLIC_NEON_AUTH_URL`, `RESEND_API_KEY`, stale SMTP block.
- `apps/web/package.json`: removed `@neondatabase/neon-js`.
- `README.md`: tech stack, prerequisites, env blocks, and a Supabase auth-setup note.
- **Verified:** `tsc --noEmit` passes for both `@corvus/api` and `@corvus/web`; no remaining
  `neon`/`@neondatabase` references in source.

### ⚠️ Deferred to Phase 5 (dead code from this migration)
- `apps/api/src/lib/email.ts` (SMTP/nodemailer) is now unreferenced — Supabase sends auth
  emails. To be removed in Phase 5 (along with `nodemailer` dep) unless transactional email
  is re-introduced.

### ⚠️ Owner action required
- Create a Supabase project; set the env vars above in both apps.
- Enable Email (and Google) auth providers; add redirect URLs
  (`/auth/callback`, `/reset-password`) in Supabase Auth settings.
- Point `DATABASE_URL`/`DIRECT_URL` at Supabase and run
  `pnpm --filter @corvus/api db:push` to create the schema.

---

## Phase 3 — Supabase Storage (complete, code-level)

All binary assets now go through the API into **Supabase Storage** (service-role,
public buckets). Nothing is written to local disk or stored as base64 in Postgres.

### Audit of every storage path (before → after)
| Asset | Before | After |
|-------|--------|-------|
| Message attachments | Local disk (`uploads/`, ephemeral) | `attachments` bucket |
| Server icons (create) | API `/attachments` → disk | `server-icons` bucket |
| Server icons (settings) | base64 data URI in DB | `server-icons` bucket |
| Avatars | base64 data URI in DB | `avatars` bucket |
| Stickers | base64 data URI in DB (`image_data`) | `stickers` bucket |

### API
- **Added** `src/services/storage.ts` — storage service: bucket constants,
  `uploadObject`, `deleteObject`, `generateObjectKey`, `parseDataUri`.
- **Added** `scripts/setup-storage.ts` — idempotent bucket creation (public,
  per-bucket size/mime limits); wired as `setup:storage` npm script. Smoke-tested
  (loads + reaches the Supabase calls; only fails on missing creds, as expected).
- **`routes/attachments.ts`** — rewritten: removed all disk I/O and the legacy
  `GET /uploads/:fileName` serving route. `POST /attachments` now uploads to the
  `attachments` bucket and returns the public URL (same response shape, so the web
  `uploadAttachment` is unchanged). Added `POST /uploads/avatar` and
  `POST /uploads/icon` (auth-guarded, image-only, 5 MB cap) → `{ url }`.
- **`routes/stickers.ts`** — decodes the base64 data URI, uploads to the
  `stickers` bucket, stores the URL; best-effort object delete on sticker delete.
- **Schema:** `Sticker.imageData` (`image_data`) → `imageUrl` (`image_url`).

### Web
- **`lib/api.ts`** — added `uploadImage(file, "avatar" | "icon")`; `StickerData.imageData`
  → `imageUrl`.
- **`UserSettingsModal`** (avatar) & **`ServerSettingsModal`** (icon): canvas resize →
  `canvas.toBlob` → `uploadImage` → store the returned URL (was base64 data URI).
- **`CreateServerModal`** (icon): now uses `uploadImage("icon")` (was `uploadAttachment`
  + `resolveAttachmentUrl`); removed the now-unused imports.
- **`StickerPicker` / `ChatView` / `DMChatView`**: render `sticker.imageUrl`.

### Verified
- `tsc --noEmit` passes for `@corvus/api` and `@corvus/web`.

### ⚠️ Owner action required
- Run `pnpm --filter @corvus/api setup:storage` once Supabase creds are set
  (also added to the deploy build — see Phase 4).

---

## Phase 4 — Render → Vercel + custom WS → Supabase Realtime (complete, code-level)

**Decisions:** Supabase Realtime **Broadcast (server-authoritative)** + run the Hono
REST API as **Vercel serverless functions**. Serverless can't hold in-memory state,
so presence and voice/stage/call state were re-architected.

### Realtime — server
- **Added** `src/services/realtime.ts` — pushes events to Supabase via the HTTP
  Broadcast API (service-role). Exposes the same `broadcastToChannel` /
  `broadcastToDMConversation` / `broadcastToUsers` signatures the routes already used.
  Topics: `channel:<id>`, `dm:<id>`, `user:<id>`. Events keep the `{type,data}` envelope.
- **Deleted** `src/ws.ts` (the always-on WebSocket server).
- Routes repointed from `../ws.js` → `../services/realtime.js`: `messages`, `dms`,
  `calls`, `voice`, `stage`.

### State moved out of memory (serverless-safe) — new Prisma models
- `VoiceParticipant`, `StageParticipant`, `CallRoom` + `CallParticipant`.
- `voice.ts`, `stage.ts`, `calls.ts` rewritten to read/write these tables instead of
  in-memory `Map`s, and broadcast via the realtime service.
- **Caveat:** serverless has no socket-disconnect hook, so a client that vanishes
  without calling `/voice/leave` can leave a stale `VoiceParticipant` row. Mitigated
  (join clears the user's other rows); a periodic cleanup or moving voice to Supabase
  Presence is the recommended follow-up.

### Presence — now client-driven (Supabase Presence)
- Removed all server-side `broadcastPresenceUpdate` calls from `auth.ts`.
- Online/offline + status are tracked via Supabase Presence on a shared `presence`
  channel; `invisible` renders as offline to others.

### Realtime — web
- **Added** `lib/supabase/realtime.ts` — Realtime transport: per-topic Broadcast
  subscriptions, client typing broadcasts, and Presence; re-emits the legacy
  `{type,data}` events to a single handler.
- **`hooks/useWebSocket.ts`** — transport swapped from the raw `WebSocket` to the
  Supabase manager. The entire event-handling `switch` and the hook's public API
  (`subscribe`/`unsubscribe`/`sendTypingStart`/… ) are unchanged, so consumers
  (`ChatView`, `DMChatView`, …) needed no edits. Added a status→presence sync effect.

### API as Vercel serverless
- Split `src/index.ts` → `src/app.ts` (builds + exports the Hono app) and
  `src/index.ts` (local/persistent Node server via `@hono/node-server`).
- **Added** `api/index.ts` (Vercel function via `hono/vercel`, Node runtime) +
  `apps/api/vercel.json` (catch-all rewrite, `prisma generate` build step).
- Added `PUT` to the CORS allowed methods (used by channel-permissions).

### Deployment / CI
- **Deleted** `render.yaml`.
- **Added** `apps/web/vercel.json` (Next.js).
- **Added** `.github/workflows/ci.yml` (typecheck api + web; lint non-blocking until
  Phase 5). Fixed `release.yml`: `@veyra/web` → `@corvus/web`; swapped
  `NEXT_PUBLIC_WS_URL` for the Supabase build env vars.
- **Added** `supabase/realtime-policies.sql` — optional RLS to upgrade Broadcast
  topics from public to private (gated by `REALTIME_PRIVATE_CHANNELS=true`).
- README deployment section + tech stack rewritten for Vercel + Supabase Realtime.

### Verified
- `tsc --noEmit` passes for `@corvus/api` and `@corvus/web`; `hono/vercel` resolves.

### ⚠️ Owner action / must be live-tested (could not be verified here)
- **Realtime** (messages, typing, presence, voice, stage, calls) needs multi-client
  testing against a real Supabase project. Default topics are **public**
  (unguessable cuids) — apply `supabase/realtime-policies.sql` +
  `REALTIME_PRIVATE_CHANNELS=true` to harden.
- **API on Vercel**: verify the serverless function build + catch-all rewrite on the
  first deploy. Fallback: run the API as a persistent Node server (`start`).
- Run `db:push` to create the new `voice_participants` / `stage_participants` /
  `call_rooms` / `call_participants` tables.

---

## Phase 5 — Modularity & code quality (complete)

### Folder structure / service & repository layers
- API now has a clear layering: `routes/` (HTTP) → `repositories/` (DB access) →
  `services/` (storage, realtime) → `lib/` (prisma, supabase, jwt, …).
- **Supabase client** is a single module per side: `apps/api/src/lib/supabase.ts`
  (server/admin) and `apps/web/lib/supabase/{client,realtime}.ts` (browser).
- **Storage** logic lives in `apps/api/src/services/storage.ts`; **realtime** in
  `apps/api/src/services/realtime.ts` + `apps/web/lib/supabase/realtime.ts`.
- **Repository pattern** established: `apps/api/src/repositories/userRepository.ts`
  is the canonical example, and `routes/auth.ts` now goes through it for *all* user
  data access (no inline `prisma.user.*` left in the auth flow). Remaining route
  files should adopt the same pattern incrementally (left as a documented follow-up
  rather than a single large untested rewrite).

### Dead code removed
- `apps/api/src/lib/email.ts` (+ `nodemailer`, `@types/nodemailer`) — Supabase sends
  auth emails now.
- `ws` / `@types/ws` deps and the `ws` type from `tsconfig` (WebSocket server gone).
- `apps/web/errors.txt`; the dead WebSocket helpers in `apps/web/lib/endpoints.ts`.
- Unused stub packages `packages/db` and `packages/trpc`.

### Tooling
- **ESLint** (was referenced but not installed): added `eslint`, `typescript-eslint`,
  `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-config-prettier`; new flat
  `eslint.config.mjs`. Repo lints clean (**0 errors**, 63 warnings — mostly the
  pre-existing `any` usages, surfaced as warnings with a documented policy).
- **Prettier**: added `.prettierrc.json` + `.prettierignore` + root `format` /
  `format:check` scripts (tabWidth 4 / printWidth 100 to match existing style; the
  repo was intentionally **not** mass-reformatted to avoid a huge noise diff).
- Root `lint` → `eslint .`; web `lint` → `eslint .` (replacing the broken,
  unconfigured `next lint`). CI `lint` step is now blocking.

### `any` policy
- Remaining `any` (notably `prisma as any` + `.map((x: any))` in `dms.ts`/`friends.ts`,
  and dynamic realtime payloads) are flagged as ESLint **warnings**. They are
  pre-existing/dynamic and left for a typed follow-up rather than a risky blind
  retype on an untested codebase.

### Known remaining duplication (documented, not changed)
- Attachment validation constants are duplicated between `apps/api/src/routes/attachments.ts`
  and `apps/web/lib/attachments.ts`. De-duplicating needs a shared package — a good
  future use for the (now-removed) stub package slot.

### Verified
- `tsc --noEmit` passes for both apps; `eslint .` → 0 errors.

---

## Phase 6 — Supabase provisioning, release downloads & dependency upgrades

### Database migration file
- **Added** `supabase/migrations/20260605000000_init.sql` — full schema (all tables,
  indexes, FKs) generated from `prisma/schema.prisma` via `prisma migrate diff`,
  plus a **Storage buckets** section (creates `avatars`, `server-icons`, `stickers`,
  `attachments`, `releases` with public read + size/mime limits) and a public-read
  RLS policy. Apply via `supabase db push`, the SQL editor, or `prisma db push` +
  `pnpm --filter @corvus/api setup:storage`.
- ⚠️ **Not applied from here:** `apps/api/.env` still holds the *old Neon* DB URL and
  has no `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (the new Supabase creds were only
  added to `apps/web/.env.local`). Point the API env at Supabase before applying.

### Release installer download via Storage
- New **`releases`** bucket (public, 500 MB, any type) in the storage service +
  setup script + migration.
- `apps/web/app/api/download/route.ts` now serves the installer straight from the
  `releases` bucket (`/storage/v1/object/public/releases/<key>?download`), with the
  existing GitHub Releases flow as fallback. Keys: `Corvus-Setup.exe` (win),
  `Corvus.dmg` (mac), `Corvus.AppImage` (linux), overridable via `NEXT_PUBLIC_RELEASE_*`.
- **Added** `scripts/upload-release.ts` (`release:upload`) to push an installer into
  the bucket under the expected key (idempotent, `upsert`).

### Dependency upgrades
- Ran `pnpm up --latest -r`, then **pinned back four deep-migration majors** that
  would otherwise break the build / can't be runtime-verified here, taking everything
  else to latest:
  - **Prisma 6.x** (7 removes `directUrl` from the schema → `prisma.config.ts` rewrite,
    changes the generator/migration workflow we depend on).
  - **TypeScript 5.x** (6 isn't supported by `typescript-eslint` 8 → would break lint).
  - **Tailwind 3.x** (4 is a CSS-first rewrite needing a config migration + visual QA).
  - **ESLint 9.x** + `eslint-plugin-react-hooks` 5 (10 / 7 are peer-incompatible with
    `typescript-eslint` 8).
  - Upgraded to latest: **Next 16**, React 19.2, **Zod 4**, `@supabase/supabase-js`
    2.107, `@hono/node-server` 2, hono 4.12, jose 6.2, framer-motion 12, lucide-react,
    dotenv 17, `@types/node` 25, etc.
- **Breakages fixed:**
  - **Zod 4:** `error.errors` → `error.issues` across 11 API route files.
  - **Next 16 / Turbopack** strict CSS: moved the Google-Fonts `@import` above
    `@tailwind` in `globals.css` (`@import` must precede all other rules).
- **Verified:** `pnpm --filter @corvus/api build` ✓, `pnpm --filter @corvus/web build`
  (Next 16, all 11 routes) ✓, `eslint .` → 0 errors.
- These four pinned majors are each worth a dedicated, individually-tested upgrade PR
  later; they are not blockers for current functionality.

### Download button → direct Supabase download (no GitHub flow)
- `apps/web/app/api/download/route.ts` rewritten to redirect **straight to the
  Supabase `releases` bucket** public URL with `?download` (HEAD-checks first and
  returns a clear 404 if the installer isn't uploaded). The GitHub-release proxy was
  removed.
- **Installer stored in Supabase:** uploaded the existing build
  `Veyra_0.0.1_x64-setup.exe` → `releases/Corvus-Setup.exe`. Verified public download
  works (`200`, `application/x-msdownload`, `Content-Disposition: attachment`).
- Lowered the `releases` bucket cap to **50 MB** (the 500 MB value exceeded Supabase's
  default global upload limit and rejected bucket creation).
- `release.yml`: fixed the release name `Veyra` → `Corvus`, and added a step that
  uploads the freshly-built NSIS installer to the `releases` bucket on every release
  (needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` repo secrets).

### ⚠️ Follow-ups
- `tauri.conf.json` updater endpoint still points at the dead Render URL
  (`https://veyra-web.onrender.com/api/updater`) — repoint it at your Vercel web
  domain (`https://<your-app>.vercel.app/api/updater`) for desktop auto-updates.
- `apps/api/.env` currently has `DIRECT_URL` but `DATABASE_URL` may need re-checking
  (Prisma's datasource uses `DATABASE_URL`).
