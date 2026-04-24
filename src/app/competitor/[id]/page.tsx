import { prisma } from "@/lib/db";
import { confidenceLabel } from "@/lib/matching";
import { threatBand, threatScore } from "@/lib/scoring";
import DeliveryForm from "./rating-form";

export default async function CompetitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: {
      deliveryRatings: true,
      snapshots: { orderBy: { createdAt: "desc" }, take: 1, include: { mcdonaldsLocation: true } },
      operatorNotes: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });

  if (!competitor) return <div>Competitor not found.</div>;

  const latest = competitor.snapshots[0];
  const avgDelivery = competitor.deliveryRatings.filter((x) => x.rating).reduce((s, x) => s + (x.rating || 0), 0) /
    Math.max(competitor.deliveryRatings.filter((x) => x.rating).length, 1);
  const score = latest
    ? threatScore({
        distanceMiles: latest.distanceMiles,
        radiusMiles: latest.radiusMiles,
        googleRating: competitor.googleRating,
        googleReviewCount: competitor.googleReviewCount,
        deliveryCoverageCount: competitor.deliveryRatings.filter((x) => x.rating !== null).length,
        avgDeliveryRating: Number.isFinite(avgDelivery) ? avgDelivery : null,
      })
    : 0;

  const summary: string[] = [];
  if ((competitor.googleRating ?? 0) >= 4.2) summary.push("High-rated local competitor");
  if (competitor.deliveryRatings.filter((d) => d.rating).length >= 2) summary.push("Strong delivery presence");
  if ((competitor.googleRating ?? 5) < 3.7) summary.push("Weak Google reputation");
  if (competitor.deliveryRatings.filter((d) => d.rating).length === 0) summary.push("Missing delivery data");
  if (latest && latest.distanceMiles <= 0.6) summary.push("Close proximity threat");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{competitor.name}</h1>
      <div className="rounded-xl border bg-white p-4 text-sm">
        <p><strong>Address:</strong> {competitor.address}</p>
        <p><strong>Google rating:</strong> {competitor.googleRating ?? "-"} ({competitor.googleReviewCount ?? 0} reviews)</p>
        <p><strong>Google Maps:</strong> <a className="text-blue-600" href={competitor.googleMapsUrl || "#"} target="_blank">Open link</a></p>
        {latest && <p><strong>Distance from selected McDonald&apos;s:</strong> {latest.distanceMiles} miles</p>}
        <p><strong>Threat score:</strong> {score} ({threatBand(score)})</p>
      </div>

      <div id="delivery" className="rounded-xl border bg-white p-4 text-sm">
        <h2 className="text-lg font-semibold">Delivery platform ratings</h2>
        <ul className="mt-2 space-y-2">
          {(["uber_eats", "just_eat", "deliveroo"] as const).map((provider) => {
            const record = competitor.deliveryRatings.find((r) => r.provider === provider);
            return (
              <li key={provider}>
                <strong>{provider.replace("_", " ")}:</strong>{" "}
                {record?.rating ?? "unavailable"} {record?.providerUrl ? <a className="text-blue-600" href={record.providerUrl}>source</a> : ""}
                {record ? ` • last checked ${new Date(record.lastUpdated).toLocaleString()} • ${record.dataSource} • confidence ${confidenceLabel(record.confidence)}` : ""}
              </li>
            );
          })}
        </ul>
        <div className="mt-4"><DeliveryForm competitorId={competitor.id} /></div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Operator notes</h2>
        <p className="mt-2 text-sm text-slate-700">{competitor.operatorNotes[0]?.note || "No notes yet."}</p>
      </div>

      <div className="rounded-xl border bg-amber-50 p-4 text-sm">
        <h2 className="font-semibold">Basic competitive summary</h2>
        <ul className="mt-2 list-disc pl-5">
          {summary.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </div>
  );
}
