import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDeliveryCsv } from "@/lib/csv";
import { confidenceFromMatch } from "@/lib/matching";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const csv = String(body.csv || "");
  if (!csv) return NextResponse.json({ error: "CSV content is required" }, { status: 400 });

  const rows = parseDeliveryCsv(csv);
  const competitors = await prisma.competitor.findMany();

  let matched = 0;

  for (const row of rows) {
    let best: { id: string; confidence: number } | null = null;

    for (const competitor of competitors) {
      const confidence = confidenceFromMatch({
        rowName: row.restaurant_name,
        rowPostcode: row.postcode,
        rowAddress: row.address,
        compName: competitor.name,
        compPostcode: competitor.postcode,
        compAddress: competitor.address,
      });
      if (!best || confidence > best.confidence) {
        best = { id: competitor.id, confidence };
      }
    }

    if (!best || best.confidence < 0.35) continue;

    await prisma.deliveryRating.upsert({
      where: {
        competitorId_provider: {
          competitorId: best.id,
          provider: row.provider,
        },
      },
      update: {
        rating: row.rating,
        reviewCount: row.review_count,
        providerUrl: row.source_url,
        confidence: best.confidence,
        dataSource: "csv_import",
        lastUpdated: row.last_updated ? new Date(row.last_updated) : new Date(),
      },
      create: {
        competitorId: best.id,
        provider: row.provider,
        rating: row.rating,
        reviewCount: row.review_count,
        providerUrl: row.source_url,
        confidence: best.confidence,
        dataSource: "csv_import",
        lastUpdated: row.last_updated ? new Date(row.last_updated) : new Date(),
      },
    });
    matched += 1;
  }

  return NextResponse.json({ ok: true, processed: rows.length, matched });
}
