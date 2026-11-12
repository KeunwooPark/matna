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

`spike/iframe/` is the step 1 test page for checking which map pages can be shown in an iframe. Serve it with `python3 -m http.server -d spike/iframe`.
