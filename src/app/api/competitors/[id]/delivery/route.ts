import { DataSource, DeliveryProvider } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const provider = body.provider as DeliveryProvider;

  if (!["uber_eats", "just_eat", "deliveroo"].includes(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const item = await prisma.deliveryRating.upsert({
    where: {
      competitorId_provider: {
        competitorId: id,
        provider,
      },
    },
    update: {
      rating: body.rating ? Number(body.rating) : null,
      reviewCount: body.reviewCount ? Number(body.reviewCount) : null,
      providerUrl: body.providerUrl || null,
      dataSource: (body.dataSource as DataSource) || "manual_entry",
      confidence: Number(body.confidence ?? 0.7),
      lastUpdated: new Date(),
    },
    create: {
      competitorId: id,
      provider,
      rating: body.rating ? Number(body.rating) : null,
      reviewCount: body.reviewCount ? Number(body.reviewCount) : null,
      providerUrl: body.providerUrl || null,
      dataSource: (body.dataSource as DataSource) || "manual_entry",
      confidence: Number(body.confidence ?? 0.7),
      lastUpdated: new Date(),
    },
  });

  return NextResponse.json({ ok: true, item });
}
