# matna

A small web app for a group to vote on where to meet. See [PLAN.md](PLAN.md) for the design and progress.

## Development

Requires Node 24 and Docker.

```bash
npm install
cp .env.example .env.local   # local database URL
npm run db:up                # Postgres on localhost:5433
npm run db:migrate
npm run dev
```

After changing `src/db/schema.ts`, run `npm run db:generate` and then `npm run db:migrate`.

## Deployment

The app needs a Node host for Next.js and a Postgres database. The plan is Vercel and Neon, but any Node host with Postgres works.

Deployed on Vercel (project `matna`, functions in `sin1` Singapore, see `vercel.json`) with a Neon database in Singapore.

1. Create a Postgres database. With Neon or Supabase, use the pooled connection string; the client sets `prepare: false` so transaction-mode poolers work.
2. Set the environment variables on the host:
   - `DATABASE_URL`: the database connection string.
   - `SITE_URL`: the public origin, e.g. `https://matna.example`. Share previews use it for the image URL. On Vercel it can be left out; Next.js falls back to the production domain.
   - `DATABASE_URL_UNPOOLED` (optional): a direct connection for migrations. Without it, the migration script drops Neon's `-pooler` host suffix from `DATABASE_URL`.
3. Deploy. On Vercel, the `vercel-build` script runs `scripts/migrate.mjs` and then `next build`, so pending migrations in `drizzle/` are applied before a deployment goes live. A failed migration fails the build, and the previous deployment keeps serving. Only production builds migrate; preview builds skip, so a branch can't change the production schema. On other hosts, run `MIGRATE=1 node scripts/migrate.mjs` before `npm run build`.

Schema changes: edit `src/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`, and deploy. Keep migrations backward compatible (add columns before using them, drop them a release later), since the old deployment serves traffic while the new one builds. Preview deployments run against whatever `DATABASE_URL` the Preview environment has, without migrating it, so don't point Preview at the production database.

The share-preview image is `public/og.png`, rendered from `design/og-image.html` at 1200×630.

`spike/iframe/` is the step 1 test page for checking which map pages can be shown in an iframe. Serve it with `python3 -m http.server -d spike/iframe`.
