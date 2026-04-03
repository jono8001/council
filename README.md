# Council Finance Radar

Council Finance Radar is a Next.js 14 app for monitoring English local authority finance signals from public data.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + PostgreSQL (Supabase-compatible)
- Zod, Cheerio, pdf-parse, xlsx

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   ```
3. Set `DATABASE_URL` to your Postgres instance.
4. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
5. Run migration:
   ```bash
   npm run prisma:migrate
   ```

## Seed pilot authorities

Seeds 10 pilot councils plus baseline source registry entries:

```bash
npm run seed:authorities
```

## Run ingestion

Runs discovery, parsing, signal extraction, scoring, and daily briefing generation:

```bash
npm run ingest
```

## Run app

```bash
npm run dev
```

## Tests

```bash
npm run test
```

## Deployment model

Recommended:
- **Frontend:** Vercel (Next.js app)
- **Scheduled ingestion:** GitHub Actions cron, Supabase scheduled function, or an external worker invoking `npm run ingest`

## Manual configuration still required

- Authority-specific source URLs will need refinement per council (current defaults are best-effort path templates).
- Procurement feeds and contract award source URLs should be added where available.
- PDF and spend-file parsing may need authority-specific column/format adapters over time.
