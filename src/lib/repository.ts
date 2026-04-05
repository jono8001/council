import { DataLayer, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  AnnualBaselineEvidence,
  Authority,
  AuthorityPublicReadModel,
  AuthorityScore,
  Contract,
  Document,
  FinanceEvent,
  QuarterlyEvidence,
  SpendSummary,
  TrendPoint,
  WatchAssessment,
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

function toIsoDate(date?: Date | null): string | undefined {
  return date ? date.toISOString().slice(0, 10) : undefined;
}

function normalizePublicText(text: string): string {
  return text
    .replace(/\boutturn record\b/gi, "year-end finance update")
    .replace(/\boutturn\b/gi, "year-end update")
    .replace(/\bbaseline\b/gi, "long-term financial position")
    .replace(/\bvariance\b/gi, "difference from budget")
    .replace(/\bstructural\b/gi, "long-term financial position")
    .replace(/\bUA\b/g, "unitary authority")
    .replace(/grants?\s*in\s*:\s*([0-9.,]+k?)/gi, "Government grant funding recorded: $1")
    .replace(/grants?\s*out\s*:\s*([0-9.,]+k?)/gi, "Service spending recorded: $1")
    .replace(/\bnet\s*:\s*([0-9.,]+k?)/gi, "Overall position recorded: $1");
}

function publicCategoryLabel(category: string): string {
  const key = category.toLowerCase();
  if (key === "structural") return "Long-term financial position";
  if (key === "current_warning") return "Difference from budget";
  if (key === "spend_pattern") return "Spending update";
  if (key === "procurement") return "Procurement update";
  if (key === "governance_history") return "Governance update";
  return normalizePublicText(category.replace(/_/g, " "));
}

function whyItMatters(category: string): string {
  const key = category.toLowerCase();
  if (key === "current_warning") return "this may indicate pressure on this year’s budget plans.";
  if (key === "structural") return "this helps explain longer-term financial resilience.";
  if (key === "spend_pattern") return "this may show changes in how public money is being spent.";
  if (key === "procurement") return "this can highlight changes in supplier or contract risk.";
  if (key === "governance_history") return "this provides context on repeated financial governance concerns.";
  return "this is relevant to understanding local council finance risk.";
}

function isAnnualCentralGovernmentSignal(text: string): boolean {
  return /mhclg|dluhc|annual|outturn|year-end/i.test(text);
}

function buildSignalEvent(
  row: {
    id: string;
    authorityId: string;
    detectedAt: Date;
    title: string;
    category: string;
    severity: string;
    evidenceText: string;
    sourceUrl: string | null;
    document?: { publicationDate: Date | null; url: string | null } | null;
  },
  authorityName?: string,
): FinanceEvent {
  const addedDate = row.detectedAt.toISOString().slice(0, 10);
  const sourceDate = toIsoDate(row.document?.publicationDate);
  const isAnnual = isAnnualCentralGovernmentSignal(row.title);

  return {
    id: row.id,
    authorityId: row.authorityId,
    date: addedDate,
    title: isAnnual ? "Latest annual finance record on this site" : normalizePublicText(row.title),
    category: isAnnual ? "Annual finance update" : publicCategoryLabel(row.category),
    severity: row.severity,
    summary: [
      isAnnual && authorityName
        ? `For ${authorityName}. This is background context from the latest available annual record.`
        : normalizePublicText(row.evidenceText),
      `Added to site on ${addedDate}.`,
      `Source published on ${sourceDate ?? "date not stated in source"}.`,
      `Why it matters: ${isAnnual ? "this gives a plain-English year-end update on the council’s financial position." : whyItMatters(row.category)}`,
      `Next: ${row.sourceUrl || row.document?.url ? "open the source document." : "check the council finance page for supporting evidence."}`,
    ].join(" "),
    sourceUrl: row.sourceUrl ?? row.document?.url ?? undefined,
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
  const [rows, authorityRows] = await Promise.all([
    db.signal.findMany({
      where: authorityId ? { authorityId } : undefined,
      orderBy: { detectedAt: "desc" },
      take: 50,
      include: {
        document: {
          select: {
            publicationDate: true,
            url: true,
          },
        },
      },
    }),
    db.authority.findMany({
      select: { id: true, name: true },
    }),
  ]);

  const authorityById = new Map(authorityRows.map((row) => [row.id, row.name]));
  return rows.map((row) => buildSignalEvent(row, authorityById.get(row.authorityId)));
}

export async function getEvidenceChangeEvents(authorityId: string): Promise<FinanceEvent[]> {
  const [signals, quarterlyRows, annualRows, evidenceDocs, authority] = await Promise.all([
    db.signal.findMany({
      where: { authorityId },
      orderBy: { detectedAt: "desc" },
      take: 20,
      include: {
        document: {
          select: {
            publicationDate: true,
            url: true,
          },
        },
      },
    }),
    db.quarterlyPositionSnapshot.findMany({
      where: { authorityId },
      orderBy: { recordedAt: "desc" },
      take: 6,
    }),
    db.annualBaselineSnapshot.findMany({
      where: { authorityId },
      orderBy: { recordedAt: "desc" },
      take: 3,
    }),
    db.document.findMany({
      where: {
        authorityId,
        layer: { in: [DataLayer.annual_baseline, DataLayer.quarterly_update] },
      },
      select: {
        layer: true,
        periodLabel: true,
        publicationDate: true,
        updatedAt: true,
        url: true,
      },
      take: 30,
    }),
    db.authority.findUnique({
      where: { id: authorityId },
      select: { name: true },
    }),
  ]);

  const signalEvents: FinanceEvent[] = signals.map((row) => buildSignalEvent(row, authority?.name));

  const annualDocByPeriod = new Map(
    evidenceDocs
      .filter((doc) => doc.layer === DataLayer.annual_baseline)
      .map((doc) => [doc.periodLabel ?? "", doc]),
  );
  const quarterlyDocByPeriod = new Map(
    evidenceDocs
      .filter((doc) => doc.layer === DataLayer.quarterly_update)
      .map((doc) => [doc.periodLabel ?? "", doc]),
  );

  const quarterlyEvents: FinanceEvent[] = quarterlyRows.map((row) => ({
    ...(function () {
      const periodLabel = `${row.financialYear}-Q${row.quarter}`;
      const doc = quarterlyDocByPeriod.get(periodLabel);
      const addedDate = toIsoDate(doc?.updatedAt) ?? row.recordedAt.toISOString().slice(0, 10);
      const publishedDate = toIsoDate(doc?.publicationDate);

      return {
    id: `quarterly-${row.id}`,
    authorityId: row.authorityId,
    date: addedDate,
    title: `Quarterly finance record for ${row.financialYear} Q${row.quarter}`,
    category: "Quarterly finance record",
    severity: row.varianceToDate && row.varianceToDate.gt(0) ? "medium" : "low",
    summary: [
      "Coverage note: authority-level quarterly values are currently limited in this ingest.",
      `Added to site on ${addedDate}.`,
      `Source published on ${publishedDate ?? "date not stated in source"}.`,
      `Why it matters: this shows the difference from budget during the year.`,
      `Next: ${row.sourceUrl || doc?.url ? "open the source document." : "check the council finance page for supporting evidence."}`,
      row.varianceToDate
        ? `Current difference from budget reported as ${row.varianceToDate.toString()}.`
        : "Difference from budget has not been published in this update.",
    ].join(" "),
    sourceUrl: row.sourceUrl ?? doc?.url ?? undefined,
      };
    })(),
  }));

  const annualEvents: FinanceEvent[] = annualRows.map((row) => ({
    ...(function () {
      const doc = annualDocByPeriod.get(row.financialYear);
      const addedDate = toIsoDate(doc?.updatedAt) ?? row.recordedAt.toISOString().slice(0, 10);
      const publishedDate = toIsoDate(doc?.publicationDate);

      return {
    id: `annual-${row.id}`,
    authorityId: row.authorityId,
    date: addedDate,
    title: "Latest annual finance record on this site",
    category: "Annual finance update",
    severity: "low",
    summary: [
      authority?.name ? `For ${authority.name}. This is background context, not a same-day update.` : "For this council. This is background context, not a same-day update.",
      `Added to site on ${addedDate}.`,
      `Source published on ${publishedDate ?? "date not stated in source"}.`,
      "Why it matters: this gives a plain-English year-end update on the council’s financial position.",
      `Next: ${row.sourceUrl || doc?.url ? "open the source document." : "check the council finance page for supporting evidence."}`,
      normalizePublicText(row.explanation),
    ].join(" "),
    sourceUrl: row.sourceUrl ?? doc?.url ?? undefined,
      };
    })(),
  }));

  return [...signalEvents, ...quarterlyEvents, ...annualEvents]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50);
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
  const [aggregate, annual] = await Promise.all([
    db.spendTransaction.aggregate({
      where: { authorityId },
      _sum: { amount: true },
      _count: { id: true },
    }),
    db.annualBaselineSnapshot.findFirst({
      where: { authorityId },
      orderBy: { recordedAt: "desc" },
    }),
  ]);

  if (!aggregate._count.id) return undefined;

  const total = safeNumber(aggregate._sum.amount);

  return {
    authorityId,
    totalSpend: total,
    capitalSpend: 0,
    revenueSpend: total,
    debt: annual?.debtLevel ? safeNumber(annual.debtLevel) : 0,
    reserves: annual?.reservesLevel ? safeNumber(annual.reservesLevel) : 0,
    period:
      "Latest parsed spend data. Capital split may be unavailable; debt/reserves come from the latest annual central-government record when present.",
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

export async function getAuthorityPublicReadModel(authorityId: string): Promise<AuthorityPublicReadModel> {
  const [annual, quarterly, localSpendDoc, watch, docs, evidenceEvents] = await Promise.all([
    db.annualBaselineSnapshot.findFirst({
      where: { authorityId },
      orderBy: { recordedAt: "desc" },
    }),
    db.quarterlyPositionSnapshot.findFirst({
      where: { authorityId },
      orderBy: { recordedAt: "desc" },
    }),
    db.document.findFirst({
      where: { authorityId, layer: DataLayer.local_spend },
      orderBy: [{ publicationDate: "desc" }, { createdAt: "desc" }],
    }),
    db.scoreSnapshot.findFirst({
      where: { authorityId, layer: DataLayer.composite_watch },
      orderBy: { recordedAt: "desc" },
    }),
    db.document.findMany({
      where: {
        authorityId,
        layer: { in: [DataLayer.annual_baseline, DataLayer.quarterly_update, DataLayer.local_spend] },
      },
      orderBy: [{ publicationDate: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    getEvidenceChangeEvents(authorityId),
  ]);

  const latestAnnualBaseline: AnnualBaselineEvidence | undefined = annual
    ? {
      financialYear: annual.financialYear,
      netRevenueBudget: annual.netRevenueBudget ? safeNumber(annual.netRevenueBudget) : undefined,
      reservesLevel: annual.reservesLevel ? safeNumber(annual.reservesLevel) : undefined,
      debtLevel: annual.debtLevel ? safeNumber(annual.debtLevel) : undefined,
      asOfDate: annual.recordedAt.toISOString().slice(0, 10),
      sourceUrl: annual.sourceUrl ?? undefined,
      coverageStatus: annual.coverageStatus,
      confidenceScore: annual.confidenceScore ?? undefined,
      freshnessDays: annual.freshnessDays ?? undefined,
      explanation: annual.explanation,
    }
    : undefined;

  const latestQuarterlyPosition: QuarterlyEvidence | undefined = quarterly
    ? {
      financialYear: quarterly.financialYear,
      quarter: quarterly.quarter,
      budgetToDate: quarterly.budgetToDate ? safeNumber(quarterly.budgetToDate) : undefined,
      outturnToDate: quarterly.outturnToDate ? safeNumber(quarterly.outturnToDate) : undefined,
      varianceToDate: quarterly.varianceToDate ? safeNumber(quarterly.varianceToDate) : undefined,
      asOfDate: quarterly.recordedAt.toISOString().slice(0, 10),
      sourceUrl: quarterly.sourceUrl ?? undefined,
      coverageStatus: quarterly.coverageStatus,
      confidenceScore: quarterly.confidenceScore ?? undefined,
      freshnessDays: quarterly.freshnessDays ?? undefined,
      explanation: quarterly.explanation,
    }
    : undefined;

  const sourceDocuments: Document[] = docs.map((row) => ({
    id: row.id,
    authorityId: row.authorityId,
    title: row.title,
    type: row.format,
    date: row.publicationDate?.toISOString().slice(0, 10) ?? row.createdAt.toISOString().slice(0, 10),
    url: row.url,
  }));

  const caveats: string[] = [];
  if (!annual) caveats.push("No annual baseline evidence available for this authority.");
  if (!quarterly) caveats.push("No quarterly against-budget update is currently available.");
  if (!localSpendDoc) caveats.push("No local spend-over-£500 publication is currently linked.");
  if (quarterly?.freshnessDays != null && quarterly.freshnessDays > 120) {
    caveats.push(`Quarterly evidence is stale (${quarterly.freshnessDays} days since as-of date).`);
  }
  if (watch?.confidenceScore != null && watch.confidenceScore < 40) {
    caveats.push("Watch assessment confidence is limited due to missing or low-coverage evidence.");
  }

  const watchAssessment: WatchAssessment | undefined = watch
    ? {
      overall: watch.overall,
      band: watch.band,
      publicationStatus: watch.publicationStatus,
      coverageStatus: watch.coverageStatus,
      confidenceScore: watch.confidenceScore ?? undefined,
      freshnessDays: watch.freshnessDays ?? undefined,
      explanation: watch.explanation,
      caveat: "Watch assessment is secondary to the source evidence and should be read alongside linked documents.",
    }
    : undefined;

  return {
    authorityId,
    latestAnnualBaseline,
    latestQuarterlyPosition,
    latestLocalSpendPublicationDate:
      toIsoDate(localSpendDoc?.publicationDate) ?? toIsoDate(localSpendDoc?.createdAt),
    evidenceChangeEvents: evidenceEvents,
    sourceDocuments,
    watchAssessment,
    caveats,
  };
}
