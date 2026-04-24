import { ProviderRatingAdapter, ProviderRestaurant, RestaurantQuery } from "./types";

const API = "https://maps.googleapis.com/maps/api/place";

export class GooglePlacesAdapter implements ProviderRatingAdapter {
  providerName = "google_places" as const;

  constructor(private readonly apiKey: string) {}

  async searchRestaurant(query: RestaurantQuery): Promise<ProviderRestaurant[]> {
    if (!query.latitude || !query.longitude) return [];
    const url = `${API}/nearbysearch/json?location=${query.latitude},${query.longitude}&radius=1000&type=restaurant&key=${this.apiKey}`;
    const response = await fetch(url, { cache: "no-store" });
    const json = await response.json();
    return (json.results ?? []).map((result: unknown) => this.normalizeResult(result));
  }

  async getRating(providerRestaurantId: string): Promise<{ rating?: number; reviewCount?: number }> {
    const url = `${API}/details/json?place_id=${providerRestaurantId}&fields=rating,user_ratings_total&key=${this.apiKey}`;
    const response = await fetch(url, { cache: "no-store" });
    const json = await response.json();
    return {
      rating: json.result?.rating,
      reviewCount: json.result?.user_ratings_total,
    };
  }

  async getRestaurantUrl(providerRestaurantId: string): Promise<string | undefined> {
    return `https://www.google.com/maps/place/?q=place_id:${providerRestaurantId}`;
  }

  normalizeResult(rawResult: any): ProviderRestaurant {
    return {
      providerRestaurantId: rawResult.place_id,
      name: rawResult.name,
      providerUrl: `https://www.google.com/maps/place/?q=place_id:${rawResult.place_id}`,
      rating: rawResult.rating,
      reviewCount: rawResult.user_ratings_total,
      confidenceScore: 1,
      rawResult,
    };
  }

  confidenceScore(): number {
    return 1;
  }
}
