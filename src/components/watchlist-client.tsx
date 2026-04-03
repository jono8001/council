"use client";

import Link from "next/link";
import { useState } from "react";
import { formatChange } from "@/lib/format";
import { getBandColor, getBandDot } from "@/lib/scoring";
import { Authority, AuthorityScore, StressBand } from "@/types/finance";

interface Props {
  allScores: AuthorityScore[];
  authorities: Authority[];
}

export function WatchlistClient({ allScores, authorities }: Props) {
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<StressBand | "All">("All");
  const [sortBy, setSortBy] = useState<"stress" | "change">("stress");

  const filtered = allScores
    .filter((score) => {
      const authority = authorities.find((item) => item.id === score.authorityId);
      const matchesSearch =
        !search || authority?.name.toLowerCase().includes(search.toLowerCase());
      const matchesBand = bandFilter === "All" || score.band === bandFilter;

      return matchesSearch && matchesBand;
    })
    .sort((a, b) => (sortBy === "stress" ? b.overall - a.overall : b.change7d - a.change7d));

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search authorities..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-64 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={bandFilter}
          onChange={(event) => setBandFilter(event.target.value as StressBand | "All")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="All">All bands</option>
          <option value="Critical">Critical</option>
          <option value="Elevated">Elevated</option>
          <option value="Guarded">Guarded</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as "stress" | "change")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="stress">Sort by stress</option>
          <option value="change">Sort by 7d change</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No authorities match your filters yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Authority</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Stress</th>
                <th className="px-4 py-3">Borrowing</th>
                <th className="px-4 py-3">Reserves</th>
                <th className="px-4 py-3">7d</th>
                <th className="px-4 py-3">Publication</th>
                <th className="px-4 py-3">Refresh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((score) => {
                const authority = authorities.find((item) => item.id === score.authorityId);

                return (
                  <tr key={score.authorityId} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/council/${authority?.slug}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        {authority?.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{authority?.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getBandColor(score.band)}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${getBandDot(score.band)}`} />
                        {score.overall} {score.band}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{score.borrowingIndicator}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{score.reservesSignal}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${
                          score.change7d > 0
                            ? "text-red-600"
                            : score.change7d < 0
                              ? "text-green-600"
                              : "text-slate-400"
                        }`}
                      >
                        {formatChange(score.change7d)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs ${
                          score.publicationStatus === "Late"
                            ? "font-medium text-amber-600"
                            : "text-slate-400"
                        }`}
                      >
                        {score.publicationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{score.latestRefresh}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
