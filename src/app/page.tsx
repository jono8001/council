import Link from "next/link";
import {
  getAllAuthorities,
  getAllScores,
  getDailyBriefing,
  getEvents,
  getTopStats,
} from "@/lib/repository";
import { formatChange, formatCurrency } from "@/lib/format";
import { getBandColor, getBandDot } from "@/lib/scoring";

export default async function HomePage() {
  const [scores, authorities, events, stats, briefing] = await Promise.all([
    getAllScores(),
    getAllAuthorities(),
    getEvents(),
    getTopStats(),
    getDailyBriefing(),
  ]);

  const criticalCount = scores.filter((score) => score.band === "Critical").length;
  const elevatedCount = scores.filter((score) => score.band === "Elevated").length;

  return (
    <div>
      <div className="mx-auto flex max-w-7xl gap-3 px-4 pt-6">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Production data pipeline
        </span>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          England-first public data monitor
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Refreshed from ingestion runs
        </span>
      </div>

      <section className="mx-4 mt-4 max-w-7xl rounded-2xl bg-slate-900 p-8 text-white sm:mx-auto sm:p-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Council Finance Radar</h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-300">
              A daily public-signal monitor for council spend, debt, risk language, and
              financial stress across England. Built from treasury reports, spend files,
              borrowing data, and procurement records.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Not a live bank balance. Not an insolvency predictor. A transparent
              monitoring layer built from public data.
            </p>
            <p className="mt-2 text-xs text-amber-200">
              Coverage note: annual central-government finance records are currently broader than
              quarterly and local-source coverage.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="text-2xl font-bold">{criticalCount}</div>
                <div className="mt-1 text-xs text-slate-400">Higher watch scores (prototype)</div>
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="text-2xl font-bold">{elevatedCount}</div>
                <div className="mt-1 text-xs text-slate-400">Elevated watch scores (prototype)</div>
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="text-2xl font-bold">{events.length}</div>
                <div className="mt-1 text-xs text-slate-400">New signals today</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-800 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              National Watch
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{briefing.headline}</p>
            <p className="mt-2 text-xs text-slate-400">{briefing.date}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-6 px-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Added to the site today</h2>
          <div className="space-y-3">
            {events.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No new extracted events yet. Run ingestion and confirm source coverage.
              </div>
            )}

            {events.slice(0, 4).map((event) => {
              const authority = authorities.find((item) => item.id === event.authorityId);

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        event.severity === "high"
                          ? "bg-red-50 text-red-700"
                          : event.severity === "medium"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {event.category}
                    </span>
                    <span className="text-xs text-slate-400">{event.date}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{event.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {authority?.name ?? "Unknown authority"} &mdash; {event.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <StatCard label="Tracked spend from parsed data" value={formatCurrency(stats.trackedSpend)} />
          <StatCard label="Authorities monitored" value={String(stats.authoritiesMonitored)} />
          <StatCard label="New contract awards" value={String(stats.newContracts)} />
          <StatCard label="On watchlist" value={String(stats.onWatchlist)} />
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 px-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">National league table</h2>
            <Link href="/watchlist" className="text-sm text-blue-600 hover:underline">
              View full watchlist &rarr;
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Authority</th>
                  <th className="px-4 py-3">Stress</th>
                  <th className="px-4 py-3">Borrowing</th>
                  <th className="px-4 py-3">7d</th>
                  <th className="px-4 py-3">Refresh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scores
                  .slice()
                  .sort((a, b) => b.overall - a.overall)
                  .map((score) => {
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
                          <div className="text-xs text-slate-400">{authority?.type}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getBandColor(score.band)}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${getBandDot(score.band)}`} />
                            {score.overall} {score.band}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{score.borrowingIndicator}</td>
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
                        <td className="px-4 py-3 text-xs text-slate-400">{score.latestRefresh}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto mb-6 mt-10 max-w-7xl px-4">
        <div className="rounded-2xl bg-slate-900 p-8 text-white">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Daily Briefing &mdash; {briefing.date}
          </h2>
          <h3 className="mt-2 text-xl font-bold">{briefing.headline}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{briefing.body}</p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}
