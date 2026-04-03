import { getAuthority, getAllAuthorities, getScore, getEvents, getDocuments, getContracts, getSpendSummary } from '@/lib/repository';
import { getBand, getBandColor } from '@/lib/scoring';
import { formatCurrency, formatChange } from '@/lib/format';
import Link from 'next/link';

export default function CouncilPage({ params }: { params: { slug: string } }) {
  const authority = getAuthority(params.slug);
  if (!authority) return <div className="p-8 text-center text-slate-500">Council not found.</div>;

  const score = getScore(authority.id);
  const band = score ? getBand(score.overall) : null;
  const bandColor = band ? getBandColor(band) : '';
  const councilEvents = getEvents(authority.id);
  const docs = getDocuments(authority.id);
  const councilContracts = getContracts(authority.id);
  const spendSummary = getSpendSummary(authority.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{authority.name}</h1>
        <p className="text-sm text-slate-500">{authority.type} - {authority.region}</p>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {score && band && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Stress overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><div className="text-xs text-slate-500">Overall</div><div className="text-2xl font-bold">{score.overall}</div><div className={`text-xs font-semibold ${bandColor}`}>{band}</div></div>
              <div><div className="text-xs text-slate-500">7d change</div><div className="text-xl font-semibold text-slate-800">{formatChange(score.change7d)}</div></div>
              <div><div className="text-xs text-slate-500">30d change</div><div className="text-xl font-semibold text-slate-800">{formatChange(score.change30d)}</div></div>
              <div><div className="text-xs text-slate-500">Borrowing</div><div className="text-xl font-semibold text-slate-800">{score.borrowingIndicator}</div></div>
            </div>
            {score.interpretation && <p className="mt-4 text-sm text-slate-600">{score.interpretation}</p>}
          </div>
        )}
        {councilEvents.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Recent events</h2>
            <div className="space-y-3">
              {councilEvents.map(e => (
                <div key={e.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="font-medium text-sm text-slate-900">{e.title}</div>
                  <div className="text-xs text-slate-400">{e.category} - {e.date}</div>
                  {e.summary && <p className="text-xs text-slate-500 mt-1">{e.summary}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {spendSummary && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Spend summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><div className="text-xs text-slate-500">Total spend</div><div className="text-xl font-bold">{formatCurrency(spendSummary.totalSpend)}</div></div>
              <div><div className="text-xs text-slate-500">Capital</div><div className="text-xl font-semibold">{formatCurrency(spendSummary.capitalSpend)}</div></div>
              <div><div className="text-xs text-slate-500">Revenue</div><div className="text-xl font-semibold">{formatCurrency(spendSummary.revenueSpend)}</div></div>
              <div><div className="text-xs text-slate-500">Reserves</div><div className="text-xl font-semibold">{formatCurrency(spendSummary.reserves)}</div></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Period: {spendSummary.period}</p>
          </div>
        )}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4">Source documents</h2>
          {docs.length === 0 && <p className="text-sm text-slate-400">No documents.</p>}
          {docs.map(d => (
            <div key={d.id} className="border-b border-slate-100 pb-3 last:border-0">
              <div className="font-medium text-sm text-slate-900">{d.title}</div>
              <div className="text-xs text-slate-400">{d.type} - {d.date}</div>
            </div>
          ))}
        </div>
        {councilContracts.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Recent procurement</h2>
            {councilContracts.map(c => (
              <div key={c.id} className="border-b border-slate-100 pb-3 last:border-0">
                <div className="font-medium text-sm text-slate-900">{c.title}</div>
                <div className="text-xs text-slate-400">{c.supplier} - {c.date}</div>
                <div className="text-sm font-semibold mt-1">{formatCurrency(c.value)}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
