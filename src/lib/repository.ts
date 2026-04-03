import { Prisma, SignalCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { Authority, AuthorityScore, Contract, Document, FinanceEvent, SpendSummary, TrendPoint } from "@/types/finance";

function relativeTime(date?: Date | null) {
  if (!date) return "No refresh yet";
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "<1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function safeNumber(v: Prisma.Decimal | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === "number" ? v : v.toNumber();
}

export async function getAllAuthorities(): Promise<Authority[]> {
  const rows = await db.authority.findMany({ orderBy: { name: "asc" } });
  return rows.map((a) => ({ id: a.id, name: a.name, slug: a.slug, type: a.type, region: a.region }));
}

export async function getAuthority(slug: string): Promise<Authority | undefined> {
  const a = await db.authority.findUnique({ where: { slug } });
  if (!a) return undefined;
  return { id: a.id, name: a.name, slug: a.slug, type: a.type, region: a.region };
}

export async function getAllScores(): Promise<AuthorityScore[]> {
  const latest = await db.scoreSnapshot.findMany({
    orderBy: { recordedAt: "desc" },
    include: { authority: true },
  });
  const latestByAuthority = new Map<string, (typeof latest)[number]>();
  for (const row of latest) {
    if (!latestByAuthority.has(row.authorityId)) latestByAuthority.set(row.authorityId, row);
  }

  return [...latestByAuthority.values()].map((row) => ({
    authorityId: row.authorityId,
    overall: row.overall,
    band: row.band,
    change7d: 0,
    change30d: 0,
    borrowingIndicator: row.borrowingIndicator,
    reservesSignal: row.reservesSignal,
    latestRefresh: relativeTime(row.recordedAt),
    publicationStatus: row.publicationStatus,
    interpretation: row.explanation,
    watchNext: "See latest monitoring report and transparency publications.",
    drivers: [
      { label: "Structural", weight: 0.2, value: row.structural },
      { label: "Current warning", weight: 0.25, value: row.currentWarning },
      { label: "Spend pattern", weight: 0.2, value: row.spendPattern },
      { label: "Procurement", weight: 0.15, value: row.procurement },
      { label: "Governance history", weight: 0.2, value: row.governanceHistory },
    ],
  }));
}

export async function getScore(authorityId: string): Promise<AuthorityScore | undefined> {
  return (await getAllScores()).find((s) => s.authorityId === authorityId);
}

export async function getEvents(authorityId?: string): Promise<FinanceEvent[]> {
  const signals = await db.signal.findMany({
    where: authorityId ? { authorityId } : undefined,
    orderBy: { detectedAt: "desc" },
    take: 50,
  });

  return signals.map((s) => ({
    id: s.id,
    authorityId: s.authorityId,
    date: s.detectedAt.toISOString().slice(0, 10),
    title: s.title,
    category: s.category,
    severity: s.severity,
    summary: s.evidenceText,
  }));
}

export async function getDocuments(authorityId?: string): Promise<Document[]> {
  const docs = await db.document.findMany({
    where: authorityId ? { authorityId } : undefined,
    orderBy: { publicationDate: "desc" },
    take: 100,
  });
  return docs.map((d) => ({
    id: d.id,
    authorityId: d.authorityId,
    title: d.title,
    type: d.format,
    date: d.publicationDate?.toISOString().slice(0, 10) ?? d.createdAt.toISOString().slice(0, 10),
    url: d.url,
  }));
}

export async function getContracts(authorityId?: string): Promise<Contract[]> {
  const rows = await db.contractAward.findMany({ where: authorityId ? { authorityId } : undefined, orderBy: { awardedAt: "desc" } });
  return rows.map((c) => ({
    id: c.id,
    authorityId: c.authorityId,
    title: c.title,
    supplier: c.supplier,
    value: safeNumber(c.value),
    date: c.awardedAt?.toISOString().slice(0, 10) ?? c.createdAt.toISOString().slice(0, 10),
  }));
}

export async function getSpendSummary(authorityId: string): Promise<SpendSummary | undefined> {
  const tx = await db.spendTransaction.findMany({ where: { authorityId } });
  if (!tx.length) return undefined;
  const total = tx.reduce((sum, t) => sum + safeNumber(t.amount), 0);
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
  const snapshots = await db.scoreSnapshot.findMany({ where: { authorityId }, orderBy: { recordedAt: "asc" }, take: 12 });
  return snapshots.map((s) => ({ date: s.recordedAt.toISOString().slice(0, 7), score: s.overall }));
}

export async function getDailyBriefing() {
  const briefing = await db.dailyBriefing.findFirst({ orderBy: { briefingDate: "desc" } });
  if (!briefing) {
    return {
      date: "No briefing yet",
      headline: "Ingestion has not produced a daily briefing yet.",
      body: "Run ingestion after seeding sources to generate a public-signal briefing.",
    };
  }
  return {
    date: briefing.briefingDate.toISOString().slice(0, 10),
    headline: briefing.headline,
    body: briefing.body,
  };
}

export async function getTopStats() {
  const [authorities, contracts, scores, spend] = await Promise.all([
    db.authority.count(),
    db.contractAward.count({ where: { awardedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    getAllScores(),
    db.spendTransaction.aggregate({ _sum: { amount: true } }),
  ]);

  return {
    trackedSpend: safeNumber(spend._sum.amount),
    authoritiesMonitored: authorities,
    newContracts: contracts,
    onWatchlist: scores.filter((s) => s.band === "Critical" || s.band === "Elevated").length,
  };
}

export async function getAuthorityCoverage(authorityId: string) {
  const sources = await db.source.findMany({ where: { authorityId } });
  const byType = new Map<SignalCategory | string, string>();
  sources.forEach((s) => byType.set(s.sourceType, s.status));
  return byType;
}
