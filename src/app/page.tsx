import Link from "next/link";
import {
  getAllAuthorities,
  getAllScores,
  getDailyBriefing,
  getEvents,
  getIngestionStatus,
  getTopStats,
} from "@/lib/repository";
import { formatChange, formatCurrency } from "@/lib/format";
import { getBandColor, getBandDot } from "@/lib/scoring";

export default async function HomePage() {
  const [scores, authorities, events, stats, briefing, ingestionStatus] = await Promise.all([
    getAllScores(),
    getAllAuthorities(),
    getEvents(),
    getTopStats(),
    getDailyBriefing(),
    getIngestionStatus(),
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
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="text-2xl font-bold">{criticalCount}</div>
                <div className="mt-1 text-xs text-slate-400">Critical stress</div>
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="text-2xl font-bold">{elevatedCount}</div>
                <div className="mt-1 text-xs text-slate-400">Elevated stress</div>
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="text-2xl font-bold">{events.length}</div>
                <div className="mt-1 text-xs text-slate-400">Evidence items added today</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                National Watch
              </h2>
              <p className="mt-2 text-lg font-bold">{briefing.headline}</p>
              <p className="mt-1 text-xs text-slate-400">{briefing.date}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-6 px-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Latest evidence added</h2>
          <div className="space-y-3">
            {events.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No new items yet. Check back after the next data refresh.
              </div>
            )}

            {events.slice(0, 4).map((event) => {
              const authority = authorities.find((item) => item.id === event.authorityId);
              const summaryPreview = event.summary.split(". ").slice(0, 3).join(". ");

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                      {event.category}
                    </span>
                    <span className="text-slate-400">&middot;</span>
                    <span className="text-slate-500">{event.date}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{event.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">
                      {authority?.name ?? "Unknown authority"}
                    </span>{" "}
                    &mdash; {summaryPreview}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <span>
                      {event.sourceUrl ? "Source link available" : "Source link not yet available"}
                    </span>
                  </div>
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

      <section className="mx-auto mt-10 max-w-7xl px-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-900">National league table</h2>
          <Link
            href="/watchlist"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            View full watchlist &rarr;
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
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
                    <tr key={score.authorityId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/council/${authority?.slug}`}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {authority?.name}
                        </Link>
                        <span className="ml-1 text-xs text-slate-400">{authority?.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block h-2 w-2 rounded-full ${getBandDot(score.band)}`} />
                        <span className="ml-1">{score.overall}</span>
                        <span className={`ml-1 text-xs ${getBandColor(score.band)}`}>{score.band}</span>
                      </td>
                      <td className="px-4 py-3">{score.borrowingIndicator}</td>
                      <td
                        className={`px-4 py-3 ${
                          score.change7d > 0
                            ? "text-red-600"
                            : score.change7d < 0
                              ? "text-green-600"
                              : "text-slate-400"
                        }`}
                      >
                        {formatChange(score.change7d)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{score.latestRefresh}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mb-6 mt-6 max-w-7xl px-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 leading-relaxed">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Coverage &amp; freshness
          </h2>
          <p>
            Coverage is still expanding. Some councils currently rely mainly on
            annual central-government data (e.g. MHCLG revenue account and
            capital outturn returns) rather than locally published documents.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {ingestionStatus.summary}{" "}
            {ingestionStatus.status !== "pending" && (
              <span>Last run: {ingestionStatus.latestRunDate}.</span>
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto mb-6 mt-10 max-w-7xl px-4">
        <div className="rounded-2xl bg-slate-900 p-8 text-white">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Daily Briefing &mdash; {briefing.date}
          </h2>
          <h3 className="mt-2 text-xl font-bold">{briefing.headline}</h3>
          <p className="mt-3 text-slate-300">{briefing.body}</p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
