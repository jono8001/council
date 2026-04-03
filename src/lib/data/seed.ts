import { Authority, AuthorityScore, FinanceEvent, Document, Contract, SpendSummary, TrendPoint } from "@/types/finance";

export const authorities: Authority[] = [
  { id: "birmingham", name: "Birmingham City Council", slug: "birmingham", type: "Metropolitan Borough", region: "West Midlands", population: 1141816 },
  { id: "croydon", name: "London Borough of Croydon", slug: "croydon", type: "London Borough", region: "London", population: 386710 },
  { id: "slough", name: "Slough Borough Council", slug: "slough", type: "Unitary Authority", region: "South East", population: 164438 },
  { id: "thurrock", name: "Thurrock Council", slug: "thurrock", type: "Unitary Authority", region: "East of England", population: 176100 },
  { id: "woking", name: "Woking Borough Council", slug: "woking", type: "District", region: "South East", population: 100400 },
  { id: "nottingham", name: "Nottingham City Council", slug: "nottingham", type: "Unitary Authority", region: "East Midlands", population: 323700 },
  { id: "northamptonshire", name: "North Northamptonshire Council", slug: "northamptonshire", type: "Unitary Authority", region: "East Midlands", population: 359400 },
  { id: "somerset", name: "Somerset Council", slug: "somerset", type: "Unitary Authority", region: "South West", population: 571200 },
];

export const scores: AuthorityScore[] = [
  { authorityId: "birmingham", overall: 82, band: "Critical", change7d: 3, change30d: 8, borrowingIndicator: "High - £5.2bn", reservesSignal: "Depleted", latestRefresh: "2 hours ago", publicationStatus: "On time", interpretation: "Birmingham issued a Section 114 notice in September 2023. Borrowing remains exceptionally high relative to revenue. Reserves are effectively exhausted. Commissioners remain in place.", watchNext: "Q3 monitoring report expected next week. Capital programme review ongoing.", drivers: [{ label: "Borrowing", weight: 0.3, value: 95 }, { label: "Reserves", weight: 0.25, value: 90 }, { label: "Spend pressure", weight: 0.25, value: 75 }, { label: "Publication", weight: 0.2, value: 60 }] },
  { authorityId: "croydon", overall: 76, band: "Critical", change7d: -1, change30d: 2, borrowingIndicator: "Elevated - £1.6bn", reservesSignal: "Very low", latestRefresh: "5 hours ago", publicationStatus: "On time", interpretation: "Croydon has issued three Section 114 notices since 2020. Financial recovery is ongoing but borrowing linked to failed investments remains a structural burden.", watchNext: "Improvement panel report due this month.", drivers: [{ label: "Borrowing", weight: 0.3, value: 85 }, { label: "Reserves", weight: 0.25, value: 80 }, { label: "Spend pressure", weight: 0.25, value: 65 }, { label: "Publication", weight: 0.2, value: 70 }] },
  { authorityId: "slough", overall: 71, band: "Elevated", change7d: 0, change30d: -3, borrowingIndicator: "High - £760m", reservesSignal: "Negative", latestRefresh: "1 day ago", publicationStatus: "Late", interpretation: "Slough issued a Section 114 notice in 2021. Recovery progressing but accounts remain significantly delayed. Risk language in monitoring reports remains elevated.", watchNext: "Delayed accounts audit expected Q2 2026.", drivers: [{ label: "Borrowing", weight: 0.3, value: 80 }, { label: "Reserves", weight: 0.25, value: 75 }, { label: "Spend pressure", weight: 0.25, value: 60 }, { label: "Publication", weight: 0.2, value: 65 }] },
  { authorityId: "thurrock", overall: 79, band: "Critical", change7d: 2, change30d: 5, borrowingIndicator: "Extreme - £1.4bn", reservesSignal: "Depleted", latestRefresh: "3 hours ago", publicationStatus: "On time", interpretation: "Thurrock's investment strategy in solar farms created exceptional debt levels relative to its size. Commissioners appointed. Recovery will take years.", watchNext: "Asset disposal programme update imminent.", drivers: [{ label: "Borrowing", weight: 0.3, value: 98 }, { label: "Reserves", weight: 0.25, value: 85 }, { label: "Spend pressure", weight: 0.25, value: 60 }, { label: "Publication", weight: 0.2, value: 65 }] },
  { authorityId: "woking", overall: 74, band: "Critical", change7d: 1, change30d: 4, borrowingIndicator: "Extreme - £1.8bn", reservesSignal: "Negative", latestRefresh: "6 hours ago", publicationStatus: "Late", interpretation: "Woking's commercial investment debt is extraordinary for a district council. Effective insolvency. Government intervention ongoing.", watchNext: "Commissioner-led restructuring plan due.", drivers: [{ label: "Borrowing", weight: 0.3, value: 99 }, { label: "Reserves", weight: 0.25, value: 88 }, { label: "Spend pressure", weight: 0.25, value: 50 }, { label: "Publication", weight: 0.2, value: 55 }] },
  { authorityId: "nottingham", overall: 58, band: "Elevated", change7d: -2, change30d: -5, borrowingIndicator: "Moderate - £1.1bn", reservesSignal: "Low", latestRefresh: "1 day ago", publicationStatus: "On time", interpretation: "Nottingham faced significant losses from Robin Hood Energy. Reserves under pressure but partial recovery visible.", watchNext: "Annual budget statement next month.", drivers: [{ label: "Borrowing", weight: 0.3, value: 60 }, { label: "Reserves", weight: 0.25, value: 55 }, { label: "Spend pressure", weight: 0.25, value: 58 }, { label: "Publication", weight: 0.2, value: 55 }] },
  { authorityId: "northamptonshire", overall: 45, band: "Guarded", change7d: -1, change30d: -4, borrowingIndicator: "Moderate - £420m", reservesSignal: "Adequate", latestRefresh: "2 days ago", publicationStatus: "On time", interpretation: "Successor authority to the collapsed Northamptonshire CC. Financial position stabilising under new structure.", watchNext: "Medium-term financial strategy refresh.", drivers: [{ label: "Borrowing", weight: 0.3, value: 45 }, { label: "Reserves", weight: 0.25, value: 40 }, { label: "Spend pressure", weight: 0.25, value: 50 }, { label: "Publication", weight: 0.2, value: 42 }] },
  { authorityId: "somerset", overall: 42, band: "Guarded", change7d: 0, change30d: -2, borrowingIndicator: "Low - £280m", reservesSignal: "Adequate", latestRefresh: "1 day ago", publicationStatus: "On time", interpretation: "New unitary formed from legacy district/county merger. Transition pressures visible but fundamentals improving.", watchNext: "Transformation savings tracker update.", drivers: [{ label: "Borrowing", weight: 0.3, value: 35 }, { label: "Reserves", weight: 0.25, value: 40 }, { label: "Spend pressure", weight: 0.25, value: 50 }, { label: "Publication", weight: 0.2, value: 40 }] },
];

export const events: FinanceEvent[] = [
  { id: "e1", authorityId: "birmingham", date: "2026-04-03", title: "Q3 Revenue Monitoring Report Published", category: "Document", severity: "high", summary: "Report shows continued overspend on temporary accommodation and adult social care." },
  { id: "e2", authorityId: "thurrock", date: "2026-04-03", title: "Asset Disposal Update to Full Council", category: "Debt", severity: "high", summary: "Council debating next phase of solar farm asset disposals to reduce debt." },
  { id: "e3", authorityId: "croydon", date: "2026-04-02", title: "Improvement Panel Report Filed", category: "Risk", severity: "medium", summary: "Panel notes partial improvement but flags ongoing capital programme risks." },
  { id: "e4", authorityId: "slough", date: "2026-04-02", title: "Spend Over £500 Transparency File Updated", category: "Spend", severity: "low", summary: "Monthly spend transparency file published, covering March 2026." },
  { id: "e5", authorityId: "woking", date: "2026-04-01", title: "Commissioner Statement on Restructuring", category: "Risk", severity: "high", summary: "Commissioner outlines next steps for long-term financial recovery plan." },
  { id: "e6", authorityId: "nottingham", date: "2026-04-01", title: "Budget Monitoring Report Q3", category: "Document", severity: "medium", summary: "Report signals improving position but continued reserves pressure." },
];

export const documents: Document[] = [
  { id: "d1", authorityId: "birmingham", title: "Revenue Monitoring Q3 2025-26", type: "Monitoring Report", date: "2026-04-03" },
  { id: "d2", authorityId: "birmingham", title: "Capital Programme Update", type: "Capital Report", date: "2026-03-28" },
  { id: "d3", authorityId: "croydon", title: "Improvement Panel Q1 Report", type: "Governance Report", date: "2026-04-02" },
  { id: "d4", authorityId: "slough", title: "Spend Over 500 - March 2026", type: "Transparency", date: "2026-04-02" },
  { id: "d5", authorityId: "thurrock", title: "Asset Disposal Programme Update", type: "Treasury Report", date: "2026-04-03" },
  { id: "d6", authorityId: "woking", title: "Commissioner Recovery Statement", type: "Governance Report", date: "2026-04-01" },
  { id: "d7", authorityId: "nottingham", title: "Budget Monitoring Q3", type: "Monitoring Report", date: "2026-04-01" },
  { id: "d8", authorityId: "northamptonshire", title: "MTFS Update", type: "Strategy Document", date: "2026-03-25" },
];

export const contracts: Contract[] = [
  { id: "c1", authorityId: "birmingham", title: "Temporary Accommodation Framework", supplier: "Serco Housing Ltd", value: 45000000, date: "2026-03-15" },
  { id: "c2", authorityId: "croydon", title: "Highways Maintenance Contract", supplier: "Skanska UK", value: 28000000, date: "2026-02-20" },
  { id: "c3", authorityId: "nottingham", title: "Waste Collection Services", supplier: "Veolia UK", value: 18500000, date: "2026-03-01" },
  { id: "c4", authorityId: "somerset", title: "Adult Social Care Framework", supplier: "Somerset Care Ltd", value: 32000000, date: "2026-03-10" },
];

export const spendSummaries: SpendSummary[] = [
  { authorityId: "birmingham", totalSpend: 4200000000, capitalSpend: 980000000, revenueSpend: 3220000000, debt: 5200000000, reserves: 24000000, period: "2025-26 Q3" },
  { authorityId: "croydon", totalSpend: 1100000000, capitalSpend: 220000000, revenueSpend: 880000000, debt: 1600000000, reserves: 18000000, period: "2025-26 Q3" },
  { authorityId: "slough", totalSpend: 480000000, capitalSpend: 95000000, revenueSpend: 385000000, debt: 760000000, reserves: -12000000, period: "2025-26 Q3" },
  { authorityId: "thurrock", totalSpend: 520000000, capitalSpend: 110000000, revenueSpend: 410000000, debt: 1400000000, reserves: 5000000, period: "2025-26 Q3" },
  { authorityId: "woking", totalSpend: 180000000, capitalSpend: 40000000, revenueSpend: 140000000, debt: 1800000000, reserves: -8000000, period: "2025-26 Q3" },
  { authorityId: "nottingham", totalSpend: 920000000, capitalSpend: 200000000, revenueSpend: 720000000, debt: 1100000000, reserves: 32000000, period: "2025-26 Q3" },
  { authorityId: "northamptonshire", totalSpend: 780000000, capitalSpend: 160000000, revenueSpend: 620000000, debt: 420000000, reserves: 65000000, period: "2025-26 Q3" },
  { authorityId: "somerset", totalSpend: 850000000, capitalSpend: 180000000, revenueSpend: 670000000, debt: 280000000, reserves: 78000000, period: "2025-26 Q3" },
];

export const trends: Record<string, TrendPoint[]> = {
  birmingham: [
    { date: "2025-10", score: 72 }, { date: "2025-11", score: 74 }, { date: "2025-12", score: 76 },
    { date: "2026-01", score: 78 }, { date: "2026-02", score: 79 }, { date: "2026-03", score: 82 },
  ],
  croydon: [
    { date: "2025-10", score: 78 }, { date: "2025-11", score: 77 }, { date: "2025-12", score: 76 },
    { date: "2026-01", score: 77 }, { date: "2026-02", score: 76 }, { date: "2026-03", score: 76 },
  ],
  slough: [
    { date: "2025-10", score: 75 }, { date: "2025-11", score: 74 }, { date: "2025-12", score: 73 },
    { date: "2026-01", score: 72 }, { date: "2026-02", score: 71 }, { date: "2026-03", score: 71 },
  ],
  thurrock: [
    { date: "2025-10", score: 70 }, { date: "2025-11", score: 72 }, { date: "2025-12", score: 74 },
    { date: "2026-01", score: 76 }, { date: "2026-02", score: 77 }, { date: "2026-03", score: 79 },
  ],
  woking: [
    { date: "2025-10", score: 68 }, { date: "2025-11", score: 70 }, { date: "2025-12", score: 71 },
    { date: "2026-01", score: 72 }, { date: "2026-02", score: 73 }, { date: "2026-03", score: 74 },
  ],
  nottingham: [
    { date: "2025-10", score: 65 }, { date: "2025-11", score: 63 }, { date: "2025-12", score: 62 },
    { date: "2026-01", score: 60 }, { date: "2026-02", score: 59 }, { date: "2026-03", score: 58 },
  ],
  northamptonshire: [
    { date: "2025-10", score: 50 }, { date: "2025-11", score: 49 }, { date: "2025-12", score: 48 },
    { date: "2026-01", score: 47 }, { date: "2026-02", score: 46 }, { date: "2026-03", score: 45 },
  ],
  somerset: [
    { date: "2025-10", score: 46 }, { date: "2025-11", score: 45 }, { date: "2025-12", score: 44 },
    { date: "2026-01", score: 43 }, { date: "2026-02", score: 42 }, { date: "2026-03", score: 42 },
  ],
};

export const dailyBriefing = {
  date: "3 April 2026",
  headline: "Birmingham monitoring report signals further overspend; Thurrock asset disposal debate today",
  body: "Two high-stress authorities dominate today's signals. Birmingham's Q3 monitoring report confirms continued overspend in temporary accommodation and adult social care, with reserves effectively exhausted. Thurrock's full council meets today to debate the next phase of solar farm disposals. Woking's commissioner issued a statement on restructuring progress. Six authorities show new document publications in the last 48 hours.",
};
