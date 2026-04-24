import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchGooglePlaceDetails } from "@/lib/google";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY is missing" }, { status: 500 });

  const competitor = await prisma.competitor.findUnique({ where: { id } });
  if (!competitor) return NextResponse.json({ error: "Competitor not found" }, { status: 404 });

  const details = await fetchGooglePlaceDetails(competitor.googlePlaceId, apiKey);
  const updated = await prisma.competitor.update({
    where: { id },
    data: {
      googleRating: details.rating,
      googleReviewCount: details.reviewCount,
      address: details.address || competitor.address,
      googleMapsUrl: details.mapsUrl || competitor.googleMapsUrl,
    },
  });

  return NextResponse.json({ ok: true, competitor: updated });
}
