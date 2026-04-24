export type RestaurantQuery = {
  name: string;
  address?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
};

export type ProviderRestaurant = {
  providerRestaurantId: string;
  name: string;
  providerUrl?: string;
  rating?: number;
  reviewCount?: number;
  confidenceScore: number;
  rawResult?: unknown;
};

export interface ProviderRatingAdapter {
  providerName: "google_places" | "uber_eats" | "just_eat" | "deliveroo" | "csv_import";
  searchRestaurant(query: RestaurantQuery): Promise<ProviderRestaurant[]>;
  getRating(providerRestaurantId: string): Promise<{ rating?: number; reviewCount?: number }>;
  getRestaurantUrl(providerRestaurantId: string): Promise<string | undefined>;
  normalizeResult(rawResult: unknown): ProviderRestaurant;
  confidenceScore(match: ProviderRestaurant, query: RestaurantQuery): number;
}
