# Deploy Veyra on Render (Free Tier) + GitHub Releases

This repo is configured to deploy:

- `veyra-api` (Node + WebSocket API)
- `veyra-web` (Next.js web app)
- `veyra-postgres` (Render Postgres)

using `render.yaml` at the repository root.

## 1. Create services from Blueprint

1. Push this repo to GitHub.
2. In Render, click `New` -> `Blueprint`.
3. Select this GitHub repo.
4. Render will detect `render.yaml` and create:
   - `veyra-api`
   - `veyra-web`
   - `veyra-postgres`

## 2. Set required Render environment variables

During/after creation, set these variables on `veyra-api`:

- `RESEND_API_KEY` (optional but recommended for verification emails)
- `EMAIL_FROM` (default already set: `Veyra <noreply@veyra.app>`)
- `LIVEKIT_URL` (required for voice/video features)
- `LIVEKIT_API_KEY` (required for voice/video features)
- `LIVEKIT_API_SECRET` (required for voice/video features)
- `CORS_ORIGINS` (optional, comma-separated extra allowed origins)
  - Example: `https://your-custom-domain.com`

On `veyra-web`:

- `NEXT_PUBLIC_WS_URL` is optional.
  - If left empty, frontend derives it from `NEXT_PUBLIC_API_URL` as `wss://<api-host>/ws`.

## 3. Confirm deployed URLs

After first deploy:

1. Open `veyra-api` service URL and verify health response at `/`.
2. Open `veyra-web` service URL and test registration/login.

## 4. Wire desktop release builds to Render API

Your GitHub Actions release workflow uses:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

Set these in GitHub repo secrets (`Settings -> Secrets and variables -> Actions`):

- `NEXT_PUBLIC_API_URL` = your Render API URL (example `https://veyra-api.onrender.com`)
- `NEXT_PUBLIC_WS_URL` = your Render API websocket URL (example `wss://veyra-api.onrender.com/ws`)

This ensures installed desktop builds point to production API instead of localhost.

## 5. Keep download flow on GitHub Releases

The web route `apps/web/app/api/download/route.ts` resolves the latest release assets from GitHub and redirects users to the correct file. Continue publishing desktop builds to GitHub Releases.

## 6. Free-tier behavior to expect

- Render free web services spin down after inactivity.
- First request after idle can be slow (cold start).
- WebSocket clients may disconnect when the API service sleeps.

If you need always-on real-time behavior, move API to a paid plan.
