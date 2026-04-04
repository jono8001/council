import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  Authority,
  AuthorityScore,
  Contract,
  Document,
  FinanceEvent,
  SpendSummary,
  TrendPoint,
} from "@/types/finance";

function safeNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

function formatRelativeTime(date?: Date | null): string {
  if (!date) return "No refresh yet";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 60 * 1000) return "<1 hour ago";

  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/** Map internal category codes to plain-English labels for the public homepage. */
const CATEGORY_LABELS: Record<string, string> = {
  structural: "Annual finance update",
  outturn: "Year-end spending report",
  baseline: "Budget baseline update",
  variance: "Budget versus actual",
};

/** Strip jargon abbreviations from authority names. */
function friendlyAuthorityName(name: string): string {
  return name
    .replace(/\bUA\b/, "Council")
    .replace(/\bMD\b/, "Council")
    .replace(/\bLB\b/, "London Borough Council")
    .replace(/\bCC\b/, "County Council");
}

/**
 * Rewrite a raw finance event into plain public English.
 * This keeps the read-model layer responsible for presentation
 * without touching ingestion or schema.
 */
function humaniseEvent(event: FinanceEvent, authorityName: string): FinanceEvent {
  const cat = (event.category ?? "").toLowerCase();
  const friendlyName = friendlyAuthorityName(authorityName);

  // Replace category with public label
  const publicCategory = CATEGORY_LABELS[cat] ?? event.category;

  // Build a public-friendly title
  let publicTitle = event.title;
  if (cat === "structural" || cat === "outturn") {
    publicTitle = "New annual finance update added";
  } else if (/baseline/i.test(cat)) {
    publicTitle = "Budget baseline data added";
  } else if (/variance/i.test(cat)) {
    publicTitle = "New budget-versus-actual comparison added";
  }

  // Build a public-friendly summary, replacing raw grant/net figures
  let publicSummary = event.summary;
  if (/Grants in:|Grants out:|Net:/i.test(publicSummary)) {
    publicSummary =
      `${friendlyName} \u2014 This gives a plain-English year-end update on the council\u2019s longer-term financial position. Source published ${event.date}; added to the site today.`;
  } else if (/outturn|structural|baseline|variance/i.test(publicSummary)) {
    publicSummary = publicSummary
      .replace(/\boutturn\b/gi, "year-end spending report")
      .replace(/\bstructural\b/gi, "longer-term financial position")
      .replace(/\bbaseline\b/gi, "budget starting point")
      .replace(/\bvariance\b/gi, "difference from the planned budget");
  }

  return {
    ...event,
    category: publicCategory,
    title: publicTitle,
    summary: publicSummary,
  };
}

async function getLatestSnapshotsByAuthority() {
  const rows = await db.scoreSnapshot.findMany({
    orderBy: { recordedAt: "desc" },
    take: 1000,
  });
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const existing = grouped.get(row.authorityId) ?? [];
    existing.push(row);
    grouped.set(row.authorityId, existing);
  }
  return grouped;
}

export async function getAllAuthorities(): Promise<Authority[]> {
  const rows = await db.authority.findMany({ orderBy: { name: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    region: row.region,
  }));
}

export async function getAuthority(slug: string): Promise<Authority | undefined> {
  const row = await db.authority.findUnique({ where: { slug } });
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    region: row.region,
  };
}

export async function getAllScores(): Promise<AuthorityScore[]> {
  const grouped = await getLatestSnapshotsByAuthority();
  return [...grouped.entries()].map(([authorityId, snapshots]) => {
    const latest = snapshots[0];
    const snapshot7d = snapshots.find(
      (row) => latest.recordedAt.getTime() - row.recordedAt.getTime() >= 7 * 24 * 60 * 60 * 1000,
    );
    const snapshot30d = snapshots.find(
      (row) => latest.recordedAt.getTime() - row.recordedAt.getTime() >= 30 * 24 * 60 * 60 * 1000,
    );
    const change7d = snapshot7d ? latest.overall - snapshot7d.overall : 0;
    const change30d = snapshot30d ? latest.overall - snapshot30d.overall : 0;
    return {
      authorityId,
      overall: latest.overall,
      band: latest.band,
      change7d,
      change30d,
      borrowingIndicator: latest.borrowingIndicator,
      reservesSignal: latest.reservesSignal,
      latestRefresh: formatRelativeTime(latest.recordedAt),
      publicationStatus: latest.publicationStatus,
      interpretation: latest.explanation,
      watchNext: "See latest monitoring report and transparency publications.",
      drivers: [
        { label: "Structural", weight: 0.2, value: latest.structural },
        { label: "Current warning", weight: 0.25, value: latest.currentWarning },
        { label: "Spend pattern", weight: 0.2, value: latest.spendPattern },
        { label: "Procurement", weight: 0.15, value: latest.procurement },
        { label: "Governance history", weight: 0.2, value: latest.governanceHistory },
      ],
    };
  });
}

export async function getScore(authorityId: string): Promise<AuthorityScore | undefined> {
  const scores = await getAllScores();
  return scores.find((score) => score.authorityId === authorityId);
}

export async function getEvents(authorityId?: string): Promise<FinanceEvent[]> {
  const [rows, authorities] = await Promise.all([
    db.signal.findMany({
      where: authorityId ? { authorityId } : undefined,
      orderBy: { detectedAt: "desc" },
      take: 50,
    }),
    db.authority.findMany({ select: { id: true, name: true } }),
  ]);
  const authorityMap = new Map(authorities.map((a) => [a.id, a.name]));
  return rows.map((row) => {
    const raw: FinanceEvent = {
      id: row.id,
      authorityId: row.authorityId,
      date: row.detectedAt.toISOString().slice(0, 10),
      title: row.title,
      category: row.category,
      severity: row.severity,
      summary: row.evidenceText,
    };
    const name = authorityMap.get(row.authorityId) ?? "Unknown authority";
    return humaniseEvent(raw, name);
  });
}

export async function getDocuments(authorityId?: string): Promise<Document[]> {
  const rows = await db.document.findMany({
    where: authorityId ? { authorityId } : undefined,
    orderBy: [{ publicationDate: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    authorityId: row.authorityId,
    title: row.title,
    type: row.format,
    date:
      row.publicationDate?.toISOString().slice(0, 10) ?? row.createdAt.toISOString().slice(0, 10),
    url: row.url,
  }));
}

export async function getContracts(authorityId?: string): Promise<Contract[]> {
  const rows = await db.contractAward.findMany({
    where: authorityId ? { authorityId } : undefined,
    orderBy: [{ awardedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    authorityId: row.authorityId,
    title: row.title,
    supplier: row.supplier,
    value: safeNumber(row.value),
    date: row.awardedAt?.toISOString().slice(0, 10) ?? row.createdAt.toISOString().slice(0, 10),
  }));
}

export async function getSpendSummary(authorityId: string): Promise<SpendSummary | undefined> {
  const aggregate = await db.spendTransaction.aggregate({
    where: { authorityId },
    _sum: { amount: true },
    _count: { id: true },
  });
  if (!aggregate._count.id) return undefined;
  const total = safeNumber(aggregate._sum.amount);
  return {
    authorityId,
    totalSpend: total,
    capitalSpend: 0,
    revenueSpend: total,
    debt: 0,
    reserves: 0,
    period: "Latest published spend data",
  };
}

export async function getTrend(authorityId: string): Promise<TrendPoint[]> {
  const rows = await db.scoreSnapshot.findMany({
    where: { authorityId },
    orderBy: { recordedAt: "asc" },
    take: 12,
  });
  return rows.map((row) => ({
    date: row.recordedAt.toISOString().slice(0, 7),
    score: row.overall,
  }));
}

export async function getDailyBriefing() {
  const row = await db.dailyBriefing.findFirst({ orderBy: { briefingDate: "desc" } });
  if (!row) {
    return {
      date: "No briefing yet",
      headline: "Ingestion has not produced a daily briefing yet.",
      body: "Run ingestion after seeding sources to generate a public-signal briefing.",
    };
  }
  return {
    date: row.briefingDate.toISOString().slice(0, 10),
    headline: row.headline,
    body: row.body,
  };
}

export async function getTopStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [authoritiesMonitored, newContracts, scores, spendAggregate] = await Promise.all([
    db.authority.count(),
    db.contractAward.count({ where: { awardedAt: { gte: thirtyDaysAgo } } }),
    getAllScores(),
    db.spendTransaction.aggregate({ _sum: { amount: true } }),
  ]);
  return {
    trackedSpend: safeNumber(spendAggregate._sum.amount),
    authoritiesMonitored,
    newContracts,
    onWatchlist: scores.filter((score) => score.band === "Critical" || score.band === "Elevated")
      .length,
  };
}

export async function getAuthorityCoverage(authorityId: string) {
  const rows = await db.source.findMany({
    where: { authorityId },
    orderBy: { sourceType: "asc" },
  });
  return rows.map((row) => ({
    type: row.sourceType,
    status: row.status,
    format: row.sourceFormat,
    baseUrl: row.baseUrl,
  }));
}
