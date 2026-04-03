"use client";

import { useState } from "react";
import Link from "next/link";
import { Authority, AuthorityScore, StressBand } from "@/types/finance";
import { formatChange } from "@/lib/format";
import { getBandColor, getBandDot } from "@/lib/scoring";

interface Props {
  allScores: AuthorityScore[];
  authorities: Authority[];
}

export function WatchlistClient({ allScores, authorities }: Props) {
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<StressBand | "All">("All");
  const [sortBy, setSortBy] = useState<"stress" | "change">("stress");

  const filtered = allScores
    .filter((s) => {
      const auth = authorities.find((a) => a.id === s.authorityId);
      const matchSearch = !search || auth?.name.toLowerCase().includes(search.toLowerCase());
      const matchBand = bandFilter === "All" || s.band === bandFilter;
      return matchSearch && matchBand;
    })
    .sort((a, b) => (sortBy === "stress" ? b.overall - a.overall : b.change7d - a.change7d));

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search authorities..." value={search} onChange={(e) => setSearch(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={bandFilter} onChange={(e) => setBandFilter(e.target.value as StressBand | "All")} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="All">All bands</option>
          <option value="Critical">Critical</option>
          <option value="Elevated">Elevated</option>
          <option value="Guarded">Guarded</option>
          <option value="Low">Low</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "stress" | "change")} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="stress">Sort by stress</option>
          <option value="change">Sort by 7d change</option>
        </select>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No authorities match your filters yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Authority</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Stress</th><th className="px-4 py-3">Borrowing</th><th className="px-4 py-3">Reserves</th><th className="px-4 py-3">7d</th><th className="px-4 py-3">Publication</th><th className="px-4 py-3">Refresh</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const auth = authorities.find((a) => a.id === s.authorityId);
                return (
                  <tr key={s.authorityId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3"><Link href={`/council/${auth?.slug}`} className="font-medium text-slate-900 hover:text-blue-600">{auth?.name}</Link></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{auth?.type}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${getBandColor(s.band)}`}><span className={`w-1.5 h-1.5 rounded-full ${getBandDot(s.band)}`}></span>{s.overall} {s.band}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.borrowingIndicator}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.reservesSignal}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium ${s.change7d > 0 ? "text-red-600" : s.change7d < 0 ? "text-green-600" : "text-slate-400"}`}>{formatChange(s.change7d)}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs ${s.publicationStatus === "Late" ? "text-amber-600 font-medium" : "text-slate-400"}`}>{s.publicationStatus}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.latestRefresh}</td>
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
