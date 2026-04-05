import { CoverageStatus, DataLayer, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { scoreAuthority, tallySignalCategories } from "@/lib/ingest/scoreAuthority";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function coverageToPoints(status: CoverageStatus): number {
  switch (status) {
    case "full":
      return 1;
    case "partial":
      return 0.66;
    case "minimal":
      return 0.33;
    case "none":
    default:
      return 0;
  }
}

function toNumber(value?: Prisma.Decimal | null): number | null {
  if (value == null) return null;
  return value.toNumber();
}

function localSpendCoverage(spendRows: number): CoverageStatus {
  if (spendRows >= 100) return "full";
  if (spendRows >= 20) return "partial";
  if (spendRows > 0) return "minimal";
  return "none";
}

function combineCoverage(statuses: CoverageStatus[]): CoverageStatus {
  const avg = statuses.reduce((sum, status) => sum + coverageToPoints(status), 0) / statuses.length;
  if (avg >= 0.8) return "full";
  if (avg >= 0.45) return "partial";
  if (avg > 0) return "minimal";
  return "none";
}

export async function buildCompositeWatch() {
  const authorities = await db.authority.findMany({
    select: { id: true },
  });

  for (const authority of authorities) {
    const [annual, quarterly, spendRowsCount, spendAggregate, signals] = await Promise.all([
      db.annualBaselineSnapshot.findFirst({
        where: { authorityId: authority.id },
        orderBy: [{ recordedAt: "desc" }],
      }),
      db.quarterlyPositionSnapshot.findFirst({
        where: { authorityId: authority.id },
        orderBy: [{ recordedAt: "desc" }],
      }),
      db.spendTransaction.count({ where: { authorityId: authority.id } }),
      db.spendTransaction.aggregate({
        where: { authorityId: authority.id },
        _sum: { amount: true },
      }),
      db.signal.findMany({
        where: {
          authorityId: authority.id,
          detectedAt: {
            gte: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
          },
        },
        select: { category: true, weight: true },
      }),
    ]);

    const signalTotals = tallySignalCategories(signals);

    const debt = toNumber(annual?.debtLevel);
    const reserves = toNumber(annual?.reservesLevel);
    const netBudget = toNumber(annual?.netRevenueBudget);

    let structural = annual ? 20 : 0;
    if (debt != null && reserves != null) {
      const debtReserveRatio = debt / Math.max(1, Math.abs(reserves));
      structural += Math.min(40, debtReserveRatio * 8);
    }
    if (netBudget != null && reserves != null) {
      const reservesShare = Math.abs(reserves) / Math.max(1, Math.abs(netBudget));
      if (reservesShare < 0.05) structural += 20;
      else if (reservesShare < 0.1) structural += 10;
    }
    structural += Math.min(20, signalTotals.structural);

    const qBudget = toNumber(quarterly?.budgetToDate);
    const qVariance = toNumber(quarterly?.varianceToDate);

    let currentWarning = quarterly ? 15 : 0;
    if (qBudget != null && qVariance != null) {
      const variancePct = qVariance / Math.max(1, Math.abs(qBudget));
      if (variancePct >= 0.1) currentWarning += 45;
      else if (variancePct >= 0.05) currentWarning += 30;
      else if (variancePct >= 0.02) currentWarning += 18;
      else if (variancePct > 0) currentWarning += 10;
      else currentWarning += 3;
    }
    currentWarning += Math.min(20, signalTotals.current_warning);

    const spendTotal = toNumber(spendAggregate._sum.amount) ?? 0;
    let spendPattern = spendRowsCount > 0 ? 8 : 0;
    if (spendRowsCount >= 50) spendPattern += 12;
    if (spendTotal > 5_000_000) spendPattern += 10;
    if (spendTotal > 20_000_000) spendPattern += 10;
    spendPattern += Math.min(15, signalTotals.spend_pattern);

    const procurement = Math.min(40, signalTotals.procurement);
    const governanceHistory = Math.min(40, signalTotals.governance_history);

    const annualCoverage = annual?.coverageStatus ?? "none";
    const quarterlyCoverage = quarterly?.coverageStatus ?? "none";
    const spendCoverage = localSpendCoverage(spendRowsCount);
    const coverageStatus = combineCoverage([annualCoverage, quarterlyCoverage, spendCoverage]);

    const annualConfidence = annual?.confidenceScore ?? 0;
    const quarterlyConfidence = quarterly?.confidenceScore ?? 0;
    const baseConfidence =
      (annual ? 30 : 0) +
      (quarterly ? 35 : 0) +
      (spendRowsCount > 0 ? 20 : 0) +
      (signals.length > 0 ? 15 : 0);
    const confidenceScore = clamp(
      baseConfidence * 0.6 +
      annualConfidence * 0.2 +
      quarterlyConfidence * 0.2,
    );

    const freshnessCandidates = [annual?.freshnessDays, quarterly?.freshnessDays].filter(
      (value): value is number => typeof value === "number",
    );
    const freshnessDays = freshnessCandidates.length > 0 ? Math.min(...freshnessCandidates) : undefined;

    const output = scoreAuthority({
      structural: clamp(structural),
      current_warning: clamp(currentWarning),
      spend_pattern: clamp(spendPattern),
      procurement: clamp(procurement),
      governance_history: clamp(governanceHistory),
      hasRecentWarning: signalTotals.current_warning > 0,
      spendSpike: spendRowsCount > 0 && spendTotal > 20_000_000,
      confidenceScore,
    });

    await db.scoreSnapshot.create({
      data: {
        authorityId: authority.id,
        layer: DataLayer.composite_watch,
        structural: output.structural,
        currentWarning: output.currentWarning,
        spendPattern: output.spendPattern,
        procurement: output.procurement,
        governanceHistory: output.governanceHistory,
        overall: output.overall,
        band: output.band,
        explanation: `${output.explanation} Inputs: annual=${annual ? "yes" : "no"}, quarterly=${quarterly ? "yes" : "no"}, spendRows=${spendRowsCount}, signals=${signals.length}.`,
        borrowingIndicator: output.borrowingIndicator,
        reservesSignal: output.reservesSignal,
        publicationStatus: output.publicationStatus,
        coverageStatus,
        confidenceScore,
        freshnessDays,
      },
    });
  }
}
