import Link from 'next/link';

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Methodology</h1>
        <p className="text-sm text-slate-500">How the Council Finance Radar stress scores work</p>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">Overview</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Council Finance Radar is a public-signal stress index. It aggregates publicly available financial data from local authorities in England to produce a composite stress score. This is not an insolvency predictor and does not imply live bank balances.</p>
        </section>
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">Score components</h2>
          <div className="space-y-4 text-sm text-slate-600">
            <div><h3 className="font-semibold text-slate-800">Borrowing (0-100)</h3><p>Measures the ratio of external borrowing to revenue, growth rate of debt, and refinancing risk based on published accounts.</p></div>
            <div><h3 className="font-semibold text-slate-800">Reserves (0-100)</h3><p>Assesses usable reserve levels as a percentage of net revenue expenditure, rate of reserve depletion, and earmarked vs unallocated reserves.</p></div>
            <div><h3 className="font-semibold text-slate-800">Governance (0-100)</h3><p>Evaluates audit opinion timeliness, S114 notice history, CIPFA compliance indicators, and published financial management codes.</p></div>
          </div>
        </section>
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">Score bands</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-green-500"></span><span className="font-semibold text-slate-800">Low (0-25)</span><span className="text-slate-500">- Healthy financial position</span></div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-yellow-500"></span><span className="font-semibold text-slate-800">Guarded (26-50)</span><span className="text-slate-500">- Some pressure indicators</span></div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-orange-500"></span><span className="font-semibold text-slate-800">Elevated (51-75)</span><span className="text-slate-500">- Significant financial stress signals</span></div>
            <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-red-500"></span><span className="font-semibold text-slate-800">Critical (76-100)</span><span className="text-slate-500">- Severe stress, potential intervention</span></div>
          </div>
        </section>
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">Data sources</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>DLUHC Revenue Outturn returns</li>
            <li>Published annual accounts and audit reports</li>
            <li>CIPFA Financial Resilience Index</li>
            <li>Section 114 notice records</li>
            <li>Contracts Finder and procurement data</li>
            <li>Council meeting minutes and committee papers</li>
          </ul>
        </section>
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">Limitations</h2>
          <p className="text-sm text-slate-600 leading-relaxed">This tool uses seeded sample data for Phase 1. Live data ingestion pipelines are planned for Phase 2. Scores are indicative and based on publicly available signals only. They should not be used as the sole basis for any financial or policy decisions.</p>
        </section>
      </main>
    </div>
  );
}