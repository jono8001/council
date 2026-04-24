import { distanceMiles } from "@/lib/scoring";

const API = "https://maps.googleapis.com/maps/api/place";

function metersFromMiles(miles: number): number {
  return Math.round(miles * 1609.34);
}

export async function resolveMcdonalds(query: string, apiKey: string) {
  const url = `${API}/textsearch/json?query=${encodeURIComponent(`McDonald's ${query}`)}&key=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
  const json = await response.json();
  const first = json.results?.[0];
  if (!first) return null;

  return {
    name: first.name,
    address: first.formatted_address,
    placeId: first.place_id as string,
    latitude: first.geometry.location.lat as number,
    longitude: first.geometry.location.lng as number,
  };
}

export async function findNearbyCompetitors(params: {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  apiKey: string;
}) {
  const placeTypes = ["restaurant", "cafe", "meal_takeaway", "bakery"];
  const results: any[] = [];

  for (const type of placeTypes) {
    const url = `${API}/nearbysearch/json?location=${params.latitude},${params.longitude}&radius=${metersFromMiles(params.radiusMiles)}&type=${type}&key=${params.apiKey}`;
    const response = await fetch(url, { cache: "no-store" });
    const json = await response.json();
    results.push(...(json.results ?? []));
  }

  const dedup = new Map<string, any>();
  for (const place of results) {
    if (!place.place_id) continue;
    if ((place.name || "").toLowerCase().includes("mcdonald")) continue;
    dedup.set(place.place_id, place);
  }

  return Array.from(dedup.values()).map((place) => ({
    placeId: place.place_id as string,
    name: place.name as string,
    address: place.vicinity || place.formatted_address || "Unknown",
    latitude: place.geometry.location.lat as number,
    longitude: place.geometry.location.lng as number,
    category: place.types?.[0] ?? "restaurant",
    googleRating: place.rating as number | undefined,
    googleReviewCount: place.user_ratings_total as number | undefined,
    distanceMiles: distanceMiles(
      params.latitude,
      params.longitude,
      place.geometry.location.lat,
      place.geometry.location.lng,
    ),
  }));
}

export async function fetchGooglePlaceDetails(placeId: string, apiKey: string) {
  const url = `${API}/details/json?place_id=${placeId}&fields=rating,user_ratings_total,formatted_address,url&key=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
  const json = await response.json();
  const result = json.result;
  return {
    rating: result?.rating as number | undefined,
    reviewCount: result?.user_ratings_total as number | undefined,
    address: result?.formatted_address as string | undefined,
    mapsUrl: result?.url as string | undefined,
  };
}
