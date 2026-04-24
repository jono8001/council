# API Routes

## `POST /api/search`
Resolve a McDonald's location and return ranked nearby competitors.

**Body**
```json
{ "query": "Oldbury B69", "radiusMiles": 1 }
```

## `POST /api/competitors/:id/delivery`
Create/update manual delivery rating.

**Body**
```json
{
  "provider": "uber_eats",
  "rating": 4.4,
  "reviewCount": 120,
  "providerUrl": "https://...",
  "dataSource": "manual_entry",
  "confidence": 0.7
}
```

## `POST /api/competitors/:id/refresh`
Refresh Google rating/reviews for one competitor.

## `POST /api/import/csv`
CSV/manual import pipeline.

**Body**
```json
{ "csv": "restaurant_name,address,postcode,provider,rating,..." }
```
