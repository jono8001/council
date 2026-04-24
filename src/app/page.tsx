"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type ResultRow = {
  rank: number;
  competitorId: string;
  name: string;
  address: string;
  distanceMiles: number;
  category?: string;
  googleRating?: number;
  googleReviewCount?: number;
  threatScore: number;
  threatLabel: string;
  confidence: string;
  lastUpdated: string;
  delivery: { uber_eats: number | null; just_eat: number | null; deliveroo: number | null };
};

const radiusOptions = [0.5, 1, 2, 3, 5];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcdLabel, setMcdLabel] = useState<string>("");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [sortBy, setSortBy] = useState<"rank" | "distance" | "google" | "threat">("rank");
  const [csvText, setCsvText] = useState("");

  const sortedRows = useMemo(() => {
    const out = [...rows];
    if (sortBy === "distance") out.sort((a, b) => a.distanceMiles - b.distanceMiles);
    if (sortBy === "google") out.sort((a, b) => (b.googleRating ?? 0) - (a.googleRating ?? 0));
    if (sortBy === "threat") out.sort((a, b) => b.threatScore - a.threatScore);
    if (sortBy === "rank") out.sort((a, b) => a.rank - b.rank);
    return out;
  }, [rows, sortBy]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, radiusMiles }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Search failed");
      setMcdLabel(`${json.mcdonaldsLocation.name} — ${json.mcdonaldsLocation.address}`);
      setRows(json.competitors);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function importCsv() {
    const response = await fetch("/api/import/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText }),
    });
    const json = await response.json();
    alert(response.ok ? `Imported ${json.matched}/${json.processed} rows` : json.error);
  }

  async function refresh(competitorId: string) {
    await fetch(`/api/competitors/${competitorId}/refresh`, { method: "POST" });
    alert("Refreshed Google data. Run search again to update ranking.");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">McDonald’s Local Competitor Radar</h1>
        <p className="mt-2 text-sm text-slate-600">Search a McDonald’s store and rank nearby food competitors in plain English.</p>
      </header>

      <form onSubmit={onSearch} className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Store name, postcode, town, place ID, or store number"
            className="md:col-span-3 rounded-lg border px-3 py-2"
            required
          />
          <select
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value))}
            className="rounded-lg border px-3 py-2"
          >
            {radiusOptions.map((m) => (
              <option key={m} value={m}>{m} miles</option>
            ))}
          </select>
        </div>
        <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" disabled={loading}>
          {loading ? "Finding competitors..." : "Find Nearby Competitors"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">CSV delivery import (Uber Eats / Just Eat / Deliveroo)</h2>
        <p className="text-sm text-slate-600">Paste CSV rows to populate placeholder provider adapters with compliant manual data.</p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="mt-3 h-28 w-full rounded-lg border p-2 text-xs"
          placeholder="restaurant_name,address,postcode,provider,rating,review_count,source_url,last_updated"
        />
        <button onClick={importCsv} className="mt-2 rounded-md border px-3 py-1 text-sm">Import CSV</button>
      </section>

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="font-semibold">Nearby competitors</h2>
            <p className="text-xs text-slate-500">{mcdLabel || "Run a search to load results."}</p>
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded border px-2 py-1 text-sm">
            <option value="rank">Sort: Rank</option>
            <option value="distance">Sort: Distance</option>
            <option value="google">Sort: Google rating</option>
            <option value="threat">Sort: Threat score</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Rank","Restaurant","Distance","Category","Google rating","Google reviews","Uber Eats","Just Eat","Deliveroo","Confidence","Last updated","Actions",
                ].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.competitorId} className="border-t align-top">
                  <td className="px-3 py-2">{r.rank}</td>
                  <td className="px-3 py-2"><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.address}</p><p className="text-xs">Threat: {r.threatLabel} ({r.threatScore})</p></td>
                  <td className="px-3 py-2">{r.distanceMiles} mi</td>
                  <td className="px-3 py-2">{r.category || "-"}</td>
                  <td className="px-3 py-2">{r.googleRating?.toFixed(1) ?? "-"}</td>
                  <td className="px-3 py-2">{r.googleReviewCount ?? "-"}</td>
                  <td className="px-3 py-2">{r.delivery.uber_eats ?? "unavailable"}</td>
                  <td className="px-3 py-2">{r.delivery.just_eat ?? "unavailable"}</td>
                  <td className="px-3 py-2">{r.delivery.deliveroo ?? "unavailable"}</td>
                  <td className="px-3 py-2">{r.confidence}</td>
                  <td className="px-3 py-2">{new Date(r.lastUpdated).toLocaleString()}</td>
                  <td className="px-3 py-2 space-y-1">
                    <Link href={`/competitor/${r.competitorId}`} className="block text-blue-600 hover:underline">View details</Link>
                    <button onClick={() => refresh(r.competitorId)} className="block text-blue-600 hover:underline">Refresh data</button>
                    <Link href={`/competitor/${r.competitorId}#delivery`} className="block text-blue-600 hover:underline">Add/edit delivery ratings</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
