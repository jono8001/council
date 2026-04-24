import { ProviderRatingAdapter, ProviderRestaurant, RestaurantQuery } from "./types";

class PlaceholderAdapter implements ProviderRatingAdapter {
  constructor(public providerName: "uber_eats" | "just_eat" | "deliveroo") {}

  async searchRestaurant(_query: RestaurantQuery): Promise<ProviderRestaurant[]> {
    return [];
  }

  async getRating(_providerRestaurantId: string): Promise<{ rating?: number; reviewCount?: number }> {
    return {};
  }

  async getRestaurantUrl(_providerRestaurantId: string): Promise<string | undefined> {
    return undefined;
  }

  normalizeResult(rawResult: unknown): ProviderRestaurant {
    return {
      providerRestaurantId: "placeholder",
      name: "Unavailable",
      confidenceScore: 0,
      rawResult,
    };
  }

  confidenceScore(): number {
    return 0;
  }
}

export const uberEatsAdapter = new PlaceholderAdapter("uber_eats");
export const justEatAdapter = new PlaceholderAdapter("just_eat");
export const deliverooAdapter = new PlaceholderAdapter("deliveroo");
