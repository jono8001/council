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
  sourceUrl?: string;
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

export interface AnnualBaselineEvidence {
  financialYear: string;
  netRevenueBudget?: number;
  reservesLevel?: number;
  debtLevel?: number;
  asOfDate: string;
  sourceUrl?: string;
  coverageStatus: string;
  confidenceScore?: number;
  freshnessDays?: number;
  explanation: string;
}

export interface QuarterlyEvidence {
  financialYear: string;
  quarter: number;
  budgetToDate?: number;
  outturnToDate?: number;
  varianceToDate?: number;
  asOfDate: string;
  sourceUrl?: string;
  coverageStatus: string;
  confidenceScore?: number;
  freshnessDays?: number;
  explanation: string;
}

export interface WatchAssessment {
  overall: number;
  band: StressBand;
  publicationStatus: string;
  coverageStatus: string;
  confidenceScore?: number;
  freshnessDays?: number;
  explanation: string;
  caveat: string;
}

export interface AuthorityPublicReadModel {
  authorityId: string;
  latestAnnualBaseline?: AnnualBaselineEvidence;
  latestQuarterlyPosition?: QuarterlyEvidence;
  latestLocalSpendPublicationDate?: string;
  evidenceChangeEvents: FinanceEvent[];
  sourceDocuments: Document[];
  watchAssessment?: WatchAssessment;
  caveats: string[];
}
