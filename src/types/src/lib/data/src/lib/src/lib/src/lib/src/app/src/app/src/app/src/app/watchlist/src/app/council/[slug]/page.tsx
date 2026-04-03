import { authorities, scores, events, documents, contracts, spendSummaries } from '@/lib/data/seed';
import { getScoreBand } from '@/lib/scoring';
import { formatCurrency, formatDate } from '@/lib/format';
import Link from 'next/link';

export default function CouncilPage({ params }: { params: { slug: string } }) {
  const authority = authorities.find(a => a.slug === params.slug);
  if (!authority) return <div className="p-8 text-center text-slate-500">Council not found.</div>;

  const score = scores.find(s => s.authorityId === authority.id);
  const band = score ? getScoreBand(score.overall) : null;
  const councilEvents = events.filter(e => e.authorityId === authority.id);
  const docs = documents.filter(d => d.authorityId === authority.id);
  const councilContracts = contracts.filter(c => c.authorityId === authority.id);
  const spend = spendSummaries.filter(s => s.authorityId === authority.id);

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
              <div><div className="text-xs text-slate-500">Overall</div><div className="text-2xl font-bold">{score.overall}</div><div className="text-xs font-semibold">{band.label}</div></div>
              <div><div className="text-xs text-slate-500">Borrowing</div><div className="text-xl font-semibold text-slate-800">{score.borrowing}</div></div>
              <div><div className="text-xs text-slate-500">Reserves</div><div className="text-xl font-semibold text-slate-800">{score.reserves}</div></div>
              <div><div className="text-xs text-slate-500">Governance</div><div className="text-xl font-semibold text-slate-800">{score.governance}</div></div>
            </div>
            {score.summary && <p className="mt-4 text-sm text-slate-600">{score.summary}</p>}
          </div>
        )}
        {councilEvents.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Recent events</h2>
            <div className="space-y-3">
              {councilEvents.map(e => (
                <div key={e.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="font-medium text-sm text-slate-900">{e.title}</div>
                  <div className="text-xs text-slate-400">{e.category} - {formatDate(e.date)}</div>
                  {e.summary && <p className="text-xs text-slate-500 mt-1">{e.summary}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {spend.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Spend summary</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 uppercase">
                <th className="pb-2">Category</th><th className="pb-2">Year</th><th className="pb-2 text-right">Budget</th><th className="pb-2 text-right">Actual</th>
              </tr></thead>
              <tbody>{spend.map(s => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-2 text-slate-700">{s.category}</td>
                  <td className="py-2 text-slate-500">{s.year}</td>
                  <td className="py-2 text-right text-slate-700">{formatCurrency(s.budget)}</td>
                  <td className="py-2 text-right text-slate-700">{formatCurrency(s.actual)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4">Source documents</h2>
          {docs.length === 0 && <p className="text-sm text-slate-400">No documents.</p>}
          <div className="space-y-3">
            {docs.map(d => (
              <div key={d.id} className="border-b border-slate-100 pb-3 last:border-0">
                <div className="font-medium text-sm text-slate-900">{d.title}</div>
                <div className="text-xs text-slate-400">{d.type} - {d.date}</div>
              </div>
            ))}
          </div>
        </div>
        {councilContracts.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
            <h2 className="font-bold text-slate-900 mb-4">Recent procurement</h2>
            <div className="space-y-3">
              {councilContracts.map(c => (
                <div key={c.id} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0">
                  <div><div className="font-medium text-sm text-slate-900">{c.title}</div><div className="text-xs text-slate-400">{c.supplier} - {c.date}</div></div>
                  <div className="font-bold text-sm text-slate-900">{formatCurrency(c.value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}