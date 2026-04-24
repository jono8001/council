"use client";

import { useState } from "react";

export default function DeliveryForm({ competitorId }: { competitorId: string }) {
  const [provider, setProvider] = useState("uber_eats");
  const [rating, setRating] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [providerUrl, setProviderUrl] = useState("");

  async function save() {
    const response = await fetch(`/api/competitors/${competitorId}/delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, rating, reviewCount, providerUrl, dataSource: "manual_entry", confidence: 0.7 }),
    });

    const data = await response.json();
    alert(response.ok ? "Saved." : data.error || "Failed");
  }

  return (
    <div className="grid gap-2 md:grid-cols-5">
      <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded border p-2">
        <option value="uber_eats">Uber Eats</option>
        <option value="just_eat">Just Eat</option>
        <option value="deliveroo">Deliveroo</option>
      </select>
      <input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="Rating" className="rounded border p-2" />
      <input value={reviewCount} onChange={(e) => setReviewCount(e.target.value)} placeholder="Review count" className="rounded border p-2" />
      <input value={providerUrl} onChange={(e) => setProviderUrl(e.target.value)} placeholder="Source URL" className="rounded border p-2" />
      <button onClick={save} className="rounded bg-blue-600 p-2 text-white">Save</button>
    </div>
  );
}
