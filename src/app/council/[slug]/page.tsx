import Link from "next/link";
import {
  getAuthority,
  getAuthorityPublicReadModel,
  getAuthorityCoverage,
  getContracts,
  getSpendSummary,
} from "@/lib/repository";
import { getBandColor } from "@/lib/scoring";
import { formatCurrency } from "@/lib/format";

export default async function CouncilPage({
  params,
}: {
  params: { slug: string };
}) {
  const authority = await getAuthority(params.slug);

  if (!authority) {
    return <div className="p-8 text-center text-slate-500">Council not found.</div>;
  }

  const [publicReadModel, councilContracts, spendSummary, coverage] =
    await Promise.all([
      getAuthorityPublicReadModel(authority.id),
      getContracts(authority.id),
      getSpendSummary(authority.id),
      getAuthorityCoverage(authority.id),
    ]);

  const watchAssessment = publicReadModel.watchAssessment;
  const limitedCoverage =
    !publicReadModel.latestQuarterlyPosition ||
    !publicReadModel.latestLocalSpendPublicationDate ||
    publicReadModel.sourceDocuments.length === 0 ||
    publicReadModel.caveats.length > 0;
  const confidenceLabel = limitedCoverage ? "Limited" : "Higher";
  const bandColor = watchAssessment ? getBandColor(watchAssessment.band) : "";

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
        {watchAssessment ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 font-bold text-slate-900">Watch assessment</h2>
            <p className="text-xs text-slate-500">
              {limitedCoverage
                ? "Preliminary view — based mainly on annual central-government finance data."
                : "Assessment includes annual, quarterly, and local evidence."}
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Watch score</div>
                <div className="text-2xl font-bold">{watchAssessment.overall}</div>
                <div className={`text-xs font-semibold ${bandColor}`}>{watchAssessment.band}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Confidence</div>
                <div className="text-xl font-semibold text-slate-800">{confidenceLabel}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Coverage status</div>
                <div className="text-sm font-semibold text-slate-800">{watchAssessment.coverageStatus}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Evidence freshness</div>
                <div className="text-sm font-semibold text-slate-800">
                  {watchAssessment.freshnessDays != null
                    ? `${watchAssessment.freshnessDays} days`
                    : "Not stated"}
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600">{watchAssessment.caveat}</p>
            {publicReadModel.caveats.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500">
                {publicReadModel.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No watch assessment snapshot yet. Run ingestion to compute one.
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

          {publicReadModel.evidenceChangeEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No extracted signals yet.</p>
          ) : (
            <div className="space-y-3">
              {publicReadModel.evidenceChangeEvents.map((event) => (
                <div key={event.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="text-sm font-medium text-slate-900">{event.title}</div>
                  <div className="text-xs text-slate-400">
                    {event.category} - {event.date}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{event.summary}</p>
                  {event.sourceUrl && (
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                    >
                      View source document
                    </a>
                  )}
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
              <Metric
                label="Capital split"
                value={spendSummary.capitalSpend === 0 ? "Not yet available" : formatCurrency(spendSummary.capitalSpend)}
              />
              <Metric label="Revenue" value={formatCurrency(spendSummary.revenueSpend)} />
              <Metric
                label="Reserves"
                value={spendSummary.reserves === 0 ? "Not stated in latest annual record" : formatCurrency(spendSummary.reserves)}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">Period: {spendSummary.period}</p>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">Source documents</h2>

          {publicReadModel.sourceDocuments.length === 0 ? (
            <div className="space-y-2 text-sm text-slate-400">
              <p>No documents.</p>
              {publicReadModel.latestAnnualBaseline?.sourceUrl && (
                <p className="text-xs text-slate-500">
                  National annual source:{" "}
                  <a
                    href={publicReadModel.latestAnnualBaseline.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    GOV.UK / MHCLG annual finance record
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {publicReadModel.sourceDocuments.map((doc) => (
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
                      className="mt-1 inline-block text-xs text-blue-600 hover:underline"
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
