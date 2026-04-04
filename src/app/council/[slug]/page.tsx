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

  const limitedCoverage =
    coverage.length === 0 ||
    !coverage.some((item) => {
      const type = (item.type ?? "").toLowerCase();
      return /quarter|monitor|statement|local|document/.test(type);
    });

  const annualBaselineSource = coverage.find((item) => {
    const type = (item.type ?? "").toLowerCase();
    return item.baseUrl && /annual|baseline|finance/.test(type);
  });

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
            <h2 className="mb-4 font-bold text-slate-900">Watch assessment</h2>

            {limitedCoverage && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p>Preliminary view — based mainly on annual central-government finance data.</p>
                <p className="mt-1 font-medium">Confidence: Limited</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Overall</div>
                <div className="text-2xl font-bold">{score.overall}</div>
                <div className={`text-xs font-semibold ${bandColor}`}>{band}</div>
              </div>
              <Metric label="7d change" value={formatChange(score.change7d)} />
              <Metric label="30d change" value={formatChange(score.change30d)} />
              <Metric label="Borrowing" value={score.borrowingIndicator} />
            </div>
            <p className="mt-4 text-sm text-slate-600">{score.interpretation}</p>
          </section>
        ) : (
          <p className="text-sm text-slate-400">
            No score snapshot yet. Run ingestion to compute one.
          </p>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">Coverage</h2>
          <p className="text-sm text-slate-600">
            {coverage.length > 0
              ? coverage.map((item) => `${item.type}: ${item.status}`).join(" \u2022 ")
              : "No active sources configured yet."}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">Recent signals</h2>
          {councilEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No extracted signals yet.</p>
          ) : (
            <div className="space-y-4">
              {councilEvents.map((event) => (
                <div key={event.id} className="border-b border-slate-100 pb-4 last:border-0">
                  <div className="font-medium text-slate-900">{event.title}</div>
                  <div className="text-xs text-slate-400">
                    {event.category} - {event.date}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{event.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {spendSummary && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Spend summary</h2>
            <p className="text-sm text-slate-500">Period: {spendSummary.period}</p>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">Source documents</h2>
          {docs.length === 0 ? (
            annualBaselineSource?.baseUrl ? (
              <div className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">
                  National annual source: GOV.UK / MHCLG annual finance record
                </span>{" "}
                <a
                  href={annualBaselineSource.baseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open source document
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No documents.</p>
            )
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="text-sm font-medium text-slate-900">{doc.title}</div>
                  <div className="text-xs text-slate-400">
                    {doc.type} - {doc.date}
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-sm text-blue-600 hover:underline"
                    >
                      Open source document
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {councilContracts.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Recent procurement</h2>
            {councilContracts.map((contract) => (
              <div key={contract.id} className="border-b border-slate-100 pb-3 last:border-0">
                <div className="text-sm font-medium text-slate-900">{contract.title}</div>
                <div className="text-xs text-slate-400">
                  {contract.supplier} - {contract.date}
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {formatCurrency(contract.value)}
                </div>
              </div>
            ))}
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
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
