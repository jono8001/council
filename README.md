# McDonald's Local Competitor Radar (MVP)

Simple operator-friendly competitor intelligence app for McDonald's franchise teams.

## What this MVP does

- Search for a McDonald's location using store name, postcode, town, place ID, or store number.
- Pick radius: 0.5 / 1 / 2 / 3 / 5 miles.
- Pull nearby competitor outlets from Google Places.
- Show ranked table with:
  - restaurant, address, distance, category
  - Google rating + review count
  - Uber Eats / Just Eat / Deliveroo ratings (if available)
  - confidence label
  - last updated timestamp
  - threat score (0-100) with clear weighting in code
- Detail page per competitor with rating provenance and summary tags.
- Manual delivery rating edits + CSV import for compliant fallback (no scraping).

## Compliance stance

This MVP **does not** implement aggressive scraping, anti-bot bypassing, or fake user-agent behaviour.
Delivery providers currently use placeholder adapters plus CSV/manual input until approved API access exists.

## Stack

- Next.js (App Router)
- TypeScript + React
- Tailwind CSS
- Prisma + SQLite (easy MVP local setup; can swap to Supabase/Postgres)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Set `GOOGLE_MAPS_API_KEY`.
4. Run Prisma migration and generate client:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```
5. Start app:
   ```bash
   npm run dev
   ```

## Database schema

Implemented models:
- `McdonaldsLocation`
- `Competitor`
- `CompetitorSnapshot`
- `DeliveryRating`
- `OperatorNote`

See `prisma/schema.prisma` and migration SQL.

## Adapter architecture

`ProviderRatingAdapter` interface methods:
- `providerName`
- `searchRestaurant(query, location)`
- `getRating(providerRestaurantId)`
- `getRestaurantUrl(providerRestaurantId)`
- `normalizeResult(rawResult)`
- `confidenceScore(match)`

Implemented:
- `GooglePlacesAdapter` (real)
- `UberEatsAdapter` (placeholder)
- `JustEatAdapter` (placeholder)
- `DeliverooAdapter` (placeholder)
- CSV import workflow (real)

## CSV import format

Use `delivery_ratings_template.csv`.

Columns:
- `restaurant_name`
- `address`
- `postcode`
- `provider` (`uber_eats`, `just_eat`, `deliveroo`)
- `rating`
- `review_count`
- `source_url`
- `last_updated`

Matching logic:
- High: exact name + postcode/address
- Medium: similar name + postcode/address overlap
- Low: partial name only
- Unmatched: below threshold, skipped

## Threat score formula (editable)

Located in `src/lib/scoring.ts`:
- 35% proximity
- 25% Google rating
- 15% Google review count
- 15% delivery platform coverage
- 10% delivery rating average

Band labels:
- Low
- Medium
- High
- Very high

## API docs

See `docs_api.md`.

## What is real vs placeholder

### Real now
- McDonald's search + nearby competitor fetch via Google Places.
- Google rating + review count pull and refresh.
- Snapshot storage, ranking, threat scoring.
- Manual delivery rating edits.
- CSV delivery import with confidence-based matching.

### Placeholder now
- Direct Uber Eats API integration.
- Direct Just Eat API integration.
- Direct Deliveroo API integration.

These are intentionally placeholder until compliant approved API/data access is available.

## Next steps (toward production)

1. Upgrade to managed Postgres/Supabase and add auth.
2. Add approved provider API integrations and scheduled refresh jobs.
3. Add robust CSV parser (quoted commas, validation, error report UI).
4. Add store portfolio management (multi-store franchise dashboard).
5. Add trend charts and weekly alerts by competitor threat movement.
6. Add audit log and role-based permissions.
