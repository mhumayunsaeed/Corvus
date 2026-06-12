# Vercel Deployment

Deploy this monorepo as two Vercel projects from the same Git repository.

## Web Project

- Root Directory: `apps/web`
- Framework Preset: `Next.js`
- Install Command: default
- Build Command: `pnpm build`

Environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-api-project.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_RELEASES_BUCKET=releases
```

## API Project

- Root Directory: `apps/api`
- Framework Preset: `Other`
- Install Command: default
- Build Command: `pnpm vercel-build`

Environment variables:

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=https://your-web-project.vercel.app
CORS_ORIGINS=https://your-web-project.vercel.app
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
REALTIME_PRIVATE_CHANNELS=false
```

Use the pooled Supabase connection string for `DATABASE_URL`; Vercel functions are serverless and can open many short-lived database connections.

## First Deploy Checklist

1. Apply the database schema from `supabase/migrations/20260605000000_init.sql` or run `pnpm --filter @corvus/api db:push` locally against the production database.
2. Run `pnpm --filter @corvus/api setup:storage` once with production Supabase credentials.
3. Add the web callback URLs in Supabase Auth:
   - `https://your-web-project.vercel.app/auth/callback`
   - `https://your-web-project.vercel.app/reset-password`
4. Deploy the API project first, then set `NEXT_PUBLIC_API_URL` on the web project to the API deployment URL and deploy the web project.

