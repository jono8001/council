export type StressBand = "Low" | "Guarded" | "Elevated" | "Critical";

export interface Authority {
  id: string;
  name: string;
  slug: string;
  type: string;
  region: string;
  population?: number;
}

export interface AuthorityScore {
  authorityId: string;
  overall: number;
  band: StressBand;
  change7d: number;
  change30d: number;
  borrowingIndicator: string;
  reservesSignal: string;
  latestRefresh: string;
  publicationStatus: string;
  interpretation: string;
  watchNext: string;
  drivers: { label: string; weight: number; value: number }[];
}

export interface FinanceEvent {
  id: string;
  authorityId: string;
  date: string;
  title: string;
  category: string;
  severity: string;
  summary: string;
}

export interface Document {
  id: string;
  authorityId: string;
  title: string;
  type: string;
  date: string;
  url?: string;
}

export interface Contract {
  id: string;
  authorityId: string;
  title: string;
  supplier: string;
  value: number;
  date: string;
}

export interface SpendSummary {
  authorityId: string;
  totalSpend: number;
  capitalSpend: number;
  revenueSpend: number;
  debt: number;
  reserves: number;
  period: string;
}

export interface TrendPoint {
  date: string;
  score: number;
}
