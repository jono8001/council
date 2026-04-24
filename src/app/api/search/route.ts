import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchGooglePlaceDetails, findNearbyCompetitors, resolveMcdonalds } from "@/lib/google";
import { confidenceLabel } from "@/lib/matching";
import { threatBand, threatScore } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const query = String(body.query || "").trim();
  const radiusMiles = Number(body.radiusMiles || 1);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY is missing" }, { status: 500 });
  }

  if (!query) {
    return NextResponse.json({ error: "Please provide a McDonald's search query." }, { status: 400 });
  }

  const mcd = await resolveMcdonalds(query, apiKey);
  if (!mcd) {
    return NextResponse.json({ error: "No McDonald's location found." }, { status: 404 });
  }

  const postcode = mcd.address.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i)?.[0] ?? null;
  const savedMcd = await prisma.mcdonaldsLocation.upsert({
    where: { googlePlaceId: mcd.placeId },
    update: {
      name: mcd.name,
      address: mcd.address,
      postcode,
      latitude: mcd.latitude,
      longitude: mcd.longitude,
    },
    create: {
      name: mcd.name,
      address: mcd.address,
      postcode,
      latitude: mcd.latitude,
      longitude: mcd.longitude,
      googlePlaceId: mcd.placeId,
    },
  });

  const nearby = await findNearbyCompetitors({
    latitude: mcd.latitude,
    longitude: mcd.longitude,
    radiusMiles,
    apiKey,
  });

  const rows = [];

  for (const candidate of nearby) {
    const details = await fetchGooglePlaceDetails(candidate.placeId, apiKey);
    const competitor = await prisma.competitor.upsert({
      where: { googlePlaceId: candidate.placeId },
      update: {
        name: candidate.name,
        address: details.address || candidate.address,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        primaryCategory: candidate.category,
        googleRating: details.rating ?? candidate.googleRating,
        googleReviewCount: details.reviewCount ?? candidate.googleReviewCount,
        googleMapsUrl: details.mapsUrl,
      },
      create: {
        googlePlaceId: candidate.placeId,
        name: candidate.name,
        address: details.address || candidate.address,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        primaryCategory: candidate.category,
        googleRating: details.rating ?? candidate.googleRating,
        googleReviewCount: details.reviewCount ?? candidate.googleReviewCount,
        googleMapsUrl: details.mapsUrl,
      },
    });

    const deliveryRatings = await prisma.deliveryRating.findMany({ where: { competitorId: competitor.id } });
    const validDelivery = deliveryRatings.filter((r) => typeof r.rating === "number");
    const averageDeliveryRating =
      validDelivery.length > 0
        ? validDelivery.reduce((sum, item) => sum + (item.rating || 0), 0) / validDelivery.length
        : null;

    const score = threatScore({
      distanceMiles: candidate.distanceMiles,
      radiusMiles,
      googleRating: competitor.googleRating,
      googleReviewCount: competitor.googleReviewCount,
      deliveryCoverageCount: deliveryRatings.filter((r) => r.rating !== null).length,
      avgDeliveryRating: averageDeliveryRating,
    });

    const snapshot = await prisma.competitorSnapshot.create({
      data: {
        mcdonaldsLocationId: savedMcd.id,
        competitorId: competitor.id,
        radiusMiles,
        distanceMiles: Number(candidate.distanceMiles.toFixed(3)),
        rank: 0,
        threatScore: score,
      },
    });

    rows.push({
      snapshotId: snapshot.id,
      competitorId: competitor.id,
      name: competitor.name,
      address: competitor.address,
      distanceMiles: Number(candidate.distanceMiles.toFixed(2)),
      category: competitor.primaryCategory,
      googleRating: competitor.googleRating,
      googleReviewCount: competitor.googleReviewCount,
      googleMapsUrl: competitor.googleMapsUrl,
      threatScore: score,
      threatLabel: threatBand(score),
      confidence: confidenceLabel(0.7),
      delivery: {
        uber_eats: deliveryRatings.find((x) => x.provider === "uber_eats")?.rating ?? null,
        just_eat: deliveryRatings.find((x) => x.provider === "just_eat")?.rating ?? null,
        deliveroo: deliveryRatings.find((x) => x.provider === "deliveroo")?.rating ?? null,
      },
      lastUpdated: competitor.updatedAt,
    });
  }

  const ranked = rows.sort((a, b) => b.threatScore - a.threatScore).map((row, idx) => ({ ...row, rank: idx + 1 }));

  await Promise.all(
    ranked.map((row) =>
      prisma.competitorSnapshot.update({
        where: { id: row.snapshotId },
        data: { rank: row.rank },
      }),
    ),
  );

  return NextResponse.json({ mcdonaldsLocation: savedMcd, competitors: ranked });
}
