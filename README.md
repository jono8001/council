# Council Finance Radar

A public-signal stress index for English local authorities. Phase 1 MVP with seeded data.

## Pages

- **Today** (`/`) - Dashboard with stress overview, watchlist alerts, and briefing
- **Watchlist** (`/watchlist`) - Authorities on watch with key indicators
- **Council** (`/council/[slug]`) - Detailed view per authority
- **Methodology** (`/methodology`) - How scores are calculated

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Seeded data (no live APIs in Phase 1)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Important

This is a public-signal stress index, not an insolvency predictor. It does not imply live bank balances. England only.