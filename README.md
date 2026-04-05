# Council Finance Radar

Council Finance Radar is a Next.js 14 app for monitoring English local authority finance signals from public data.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + PostgreSQL (Supabase-compatible)
- Zod, Cheerio, pdf-parse, xlsx

## What works now

- Prisma-backed repository functions used by `/`, `/watchlist`, and `/council/[slug]`.
- Source discovery + document persistence + parser pipeline orchestration.
- Rule-based signal extraction and explainable score snapshot generation.
- Daily briefing persistence and ingestion run status tracking.
- Pilot authority seeding with initial source registry entries.

## What is scaffolded and needs tuning

- Source URLs in the seed script are templated defaults and must be validated per authority.
- Contract/procurement ingestion is modelled but needs authority-specific source wiring.
- Spend and PDF parsers are generic and will need council-specific adapters over time.

## Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase-compatible)
- Environment variables configured in `.env`

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
5. Run migration (local development):
   ```bash
   npm run prisma:migrate
   ```

For CI/production, use deploy migrations:
```bash
npm run prisma:migrate:deploy
```

## Seed pilot authorities

Seeds 10 pilot councils and initial source registry entries:

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
- **Scheduled ingestion:** GitHub Actions cron, Supabase scheduled function, or external worker invoking `npm run ingest`

## Manual configuration still required

- Replace templated source URLs with known-good publication endpoints for each council.
- Add procurement source links where authorities publish machine-readable award data.
- Verify parser compatibility for each authority’s CSV/XLS(X)/PDF format variants.

## Known limitations

- No install/build/test validation was possible in this environment if npm registry access is blocked.
- Ingestion currently prioritizes determinism and safety over aggressive scraping breadth.
- Authorities with partial/no source coverage will still receive low-information score snapshots.


## GitHub Actions (recommended)

A workflow is included at `.github/workflows/verify-and-ingest.yml` to verify PRs/pushes and run scheduled ingestion at 04:00 UTC.
