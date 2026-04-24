export type SearchInput = {
  query: string;
  radiusMiles: number;
};

export type CsvDeliveryRow = {
  restaurant_name: string;
  address: string;
  postcode?: string;
  provider: "uber_eats" | "just_eat" | "deliveroo";
  rating?: number;
  review_count?: number;
  source_url?: string;
  last_updated?: string;
};
