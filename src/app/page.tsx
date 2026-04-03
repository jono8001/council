import Link from "next/link";
import { getAllScores, getAllAuthorities, getEvents, getTopStats, getDailyBriefing } from "@/lib/repository";
import { formatCurrency, formatChange } from "@/lib/format";
import { getBandColor, getBandDot } from "@/lib/scoring";

export default async function HomePage() {
  const [scores, authorities, events, stats, briefing] = await Promise.all([
    getAllScores(),
    getAllAuthorities(),
    getEvents(),
    getTopStats(),
    getDailyBriefing(),
  ]);
  const criticalCount = scores.filter((s) => s.band === "Critical").length;
  const elevatedCount = scores.filter((s) => s.band === "Elevated").length;

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-6 flex gap-3">
        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">Production data pipeline</span>
        <span className="text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full">England-first public data monitor</span>
        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">Refreshed from ingestion runs</span>
      </div>

      <section className="bg-slate-900 text-white mt-4 rounded-2xl mx-4 sm:mx-auto max-w-7xl p-8 sm:p-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Council Finance Radar</h1>
            <p className="mt-3 text-lg text-slate-300 max-w-2xl">A daily public-signal monitor for council spend, debt, risk language, and financial stress across England. Built from treasury reports, spend files, borrowing data, and procurement records.</p>
            <p className="mt-2 text-sm text-slate-400">Not a live bank balance. Not an insolvency predictor. A transparent monitoring layer built from public data.</p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-xl p-4"><div className="text-2xl font-bold">{criticalCount}</div><div className="text-xs text-slate-400 mt-1">Critical stress</div></div>
              <div className="bg-slate-800 rounded-xl p-4"><div className="text-2xl font-bold">{elevatedCount}</div><div className="text-xs text-slate-400 mt-1">Elevated stress</div></div>
              <div className="bg-slate-800 rounded-xl p-4"><div className="text-2xl font-bold">{events.length}</div><div className="text-xs text-slate-400 mt-1">New signals today</div></div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">National Watch</h3>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">{briefing.headline}</p>
            <p className="mt-2 text-xs text-slate-400">{briefing.date}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 mt-8 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-4">What changed today</h2>
          <div className="space-y-3">
            {events.length === 0 && <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-500">No new extracted events yet. Run ingestion and confirm source coverage.</div>}
            {events.slice(0, 4).map((e) => {
              const auth = authorities.find((a) => a.id === e.authorityId);
              return (
                <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.severity === "high" ? "bg-red-50 text-red-700" : e.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{e.category}</span><span className="text-xs text-slate-400">{e.date}</span></div>
                  <h3 className="font-semibold text-slate-900">{e.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{auth?.name ?? "Unknown authority"} &mdash; {e.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"><div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.trackedSpend)}</div><div className="text-sm text-slate-500 mt-1">Tracked spend from parsed data</div></div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"><div className="text-2xl font-bold text-slate-900">{stats.authoritiesMonitored}</div><div className="text-sm text-slate-500 mt-1">Authorities monitored</div></div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"><div className="text-2xl font-bold text-slate-900">{stats.newContracts}</div><div className="text-sm text-slate-500 mt-1">New contract awards</div></div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"><div className="text-2xl font-bold text-slate-900">{stats.onWatchlist}</div><div className="text-sm text-slate-500 mt-1">On watchlist</div></div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 mt-10 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">National league table</h2><Link href="/watchlist" className="text-sm text-blue-600 hover:underline">View full watchlist &rarr;</Link></div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Authority</th><th className="px-4 py-3">Stress</th><th className="px-4 py-3">Borrowing</th><th className="px-4 py-3">7d</th><th className="px-4 py-3">Refresh</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {scores.sort((a, b) => b.overall - a.overall).map((s) => {
                  const auth = authorities.find((a) => a.id === s.authorityId);
                  return <tr key={s.authorityId} className="hover:bg-slate-50 transition-colors"><td className="px-4 py-3"><Link href={`/council/${auth?.slug}`} className="font-medium text-slate-900 hover:text-blue-600">{auth?.name}</Link><div className="text-xs text-slate-400">{auth?.type}</div></td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${getBandColor(s.band)}`}><span className={`w-1.5 h-1.5 rounded-full ${getBandDot(s.band)}`}></span>{s.overall} {s.band}</span></td><td className="px-4 py-3 text-xs text-slate-600">{s.borrowingIndicator}</td><td className="px-4 py-3"><span className={`text-xs font-medium ${s.change7d > 0 ? "text-red-600" : s.change7d < 0 ? "text-green-600" : "text-slate-400"}`}>{formatChange(s.change7d)}</span></td><td className="px-4 py-3 text-xs text-slate-400">{s.latestRefresh}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 mt-10 mb-6"><div className="bg-slate-900 text-white rounded-2xl p-8"><h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Daily Briefing &mdash; {briefing.date}</h2><h3 className="text-xl font-bold mt-2">{briefing.headline}</h3><p className="text-slate-300 mt-3 text-sm leading-relaxed max-w-3xl">{briefing.body}</p></div></section>
    </div>
  );
}
