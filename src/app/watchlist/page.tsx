import { getAllAuthorities, getAllScores } from "@/lib/repository";
import { WatchlistClient } from "@/components/watchlist-client";

export default async function WatchlistPage() {
  const [allScores, authorities] = await Promise.all([getAllScores(), getAllAuthorities()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">National Watchlist</h1>
      <p className="text-sm text-slate-500 mt-1 max-w-2xl">All monitored English authorities ranked by financial stress signal. Built from public documents, spend data, borrowing tables, and risk language extraction.</p>
      <WatchlistClient allScores={allScores} authorities={authorities} />
    </div>
  );
}
