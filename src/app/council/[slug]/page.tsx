import Link from "next/link";
import {
  getAuthority,
  getAuthorityCoverage,
  getContracts,
  getDocuments,
  getEvents,
  getScore,
  getSpendSummary,
} from "@/lib/repository";
import { getBand, getBandColor } from "@/lib/scoring";
import { formatChange, formatCurrency } from "@/lib/format";

export default async function CouncilPage({
  params,
}: {
  params: { slug: string };
}) {
  const authority = await getAuthority(params.slug);

  if (!authority) {
    return <div className="p-8 text-center text-slate-500">Council not found.</div>;
  }

  const [score, councilEvents, docs, councilContracts, spendSummary, coverage] =
    await Promise.all([
      getScore(authority.id),
      getEvents(authority.id),
      getDocuments(authority.id),
      getContracts(authority.id),
      getSpendSummary(authority.id),
      getAuthorityCoverage(authority.id),
    ]);

  const band = score ? getBand(score.overall) : null;
  const bandColor = band ? getBandColor(band) : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Back to dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{authority.name}</h1>
        <p className="text-sm text-slate-500">
          {authority.type} - {authority.region}
        </p>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {score ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Stress overview</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Overall</div>
                <div className="text-2xl font-bold">{score.overall}</div>
                <div className={`text-xs font-semibold ${bandColor}`}>{band}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">7d change</div>
                <div className="text-xl font-semibold text-slate-800">
                  {formatChange(score.change7d)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">30d change</div>
                <div className="text-xl font-semibold text-slate-800">
                  {formatChange(score.change30d)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Borrowing</div>
                <div className="text-xl font-semibold text-slate-800">
                  {score.borrowingIndicator}
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600">{score.interpretation}</p>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No score snapshot yet. Run ingestion to compute one.
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">Coverage</h2>
          <p className="text-sm text-slate-600">
            {coverage.length > 0
              ? coverage.map((item) => `${item.type}: ${item.status}`).join(" • ")
              : "No active sources configured yet."}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">Recent signals</h2>

          {councilEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No extracted signals yet.</p>
          ) : (
            <div className="space-y-3">
              {councilEvents.map((event) => (
                <div key={event.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="text-sm font-medium text-slate-900">{event.title}</div>
                  <div className="text-xs text-slate-400">
                    {event.category} - {event.date}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{event.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {spendSummary && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Spend summary</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Metric label="Total spend" value={formatCurrency(spendSummary.totalSpend)} />
              <Metric label="Capital" value={formatCurrency(spendSummary.capitalSpend)} />
              <Metric label="Revenue" value={formatCurrency(spendSummary.revenueSpend)} />
              <Metric label="Reserves" value={formatCurrency(spendSummary.reserves)} />
            </div>
            <p className="mt-2 text-xs text-slate-400">Period: {spendSummary.period}</p>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">Source documents</h2>

          {docs.length === 0 ? (
            <p className="text-sm text-slate-400">No documents.</p>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="text-sm font-medium text-slate-900">{doc.title}</div>
                  <div className="text-xs text-slate-400">
                    {doc.type} - {doc.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {councilContracts.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Recent procurement</h2>
            <div className="space-y-3">
              {councilContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="border-b border-slate-100 pb-3 last:border-0"
                >
                  <div className="text-sm font-medium text-slate-900">{contract.title}</div>
                  <div className="text-xs text-slate-400">
                    {contract.supplier} - {contract.date}
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {formatCurrency(contract.value)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
