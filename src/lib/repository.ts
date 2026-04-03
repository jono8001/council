import { authorities, scores, events, documents, contracts, spendSummaries, trends, dailyBriefing } from "@/lib/data/seed";

export function getAllAuthorities() {
  return authorities;
}

export function getAuthority(slug: string) {
  return authorities.find((a) => a.slug === slug);
}

export function getScore(authorityId: string) {
  return scores.find((s) => s.authorityId === authorityId);
}

export function getAllScores() {
  return scores;
}

export function getEvents(authorityId?: string) {
  if (authorityId) return events.filter((e) => e.authorityId === authorityId);
  return events;
}

export function getDocuments(authorityId?: string) {
  if (authorityId) return documents.filter((d) => d.authorityId === authorityId);
  return documents;
}

export function getContracts(authorityId?: string) {
  if (authorityId) return contracts.filter((c) => c.authorityId === authorityId);
  return contracts;
}

export function getSpendSummary(authorityId: string) {
  return spendSummaries.find((s) => s.authorityId === authorityId);
}

export function getTrend(authorityId: string) {
  return trends[authorityId] || [];
}

export function getDailyBriefing() {
  return dailyBriefing;
}

export function getTopStats() {
  const totalSpend = spendSummaries.reduce((sum, s) => sum + s.totalSpend, 0);
  const onWatchlist = scores.filter((s) => s.band === "Critical" || s.band === "Elevated").length;
  const newContracts = contracts.filter((c) => {
    const d = new Date(c.date);
    const now = new Date();
    return now.getTime() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
  }).length;
  return {
    trackedSpend: totalSpend,
    authoritiesMonitored: authorities.length,
    newContracts,
    onWatchlist,
  };
}
