import { DataLayer, PeriodKind, SourceScope, SourceType } from "@prisma/client";
import { z } from "zod";
import { db } from "../src/lib/db";

const annualRowSchema = z.object({
  authorityName: z.string().min(1),
  onsCode: z.string().regex(/^E\d{8}$/).optional(),
  slug: z.string().min(1),
  type: z.string().min(1),
  region: z.string().min(1),
  officialUrl: z.string().url().optional(),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/),
  netRevenueBudget: z.number().nullable(),
  reservesLevel: z.number().nullable(),
  debtLevel: z.number().nullable(),
  publicationDate: z.string().datetime().or(z.string().date()),
  asOfDate: z.string().datetime().or(z.string().date()),
  evidenceTitle: z.string().min(1),
  evidenceUrl: z.string().url(),
  provenancePublisher: z.string().min(1),
  provenanceDataset: z.string().min(1),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  coverageStatus: z.enum(["full", "partial", "minimal", "none"]).optional(),
});

type AnnualRow = z.infer<typeof annualRowSchema>;

const ANNUAL_SOURCE_URL =
  "https://www.gov.uk/government/statistics/local-authority-revenue-expenditure-and-financing-england";

function currentFinancialYear(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = (startYear + 1).toString().slice(2);
  return `${startYear}-${endYear}`;
}

async function fetchGovUkSourceEvidence(url: string, fallbackTitle: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const datetimeMatch = html.match(/datetime=\"(\d{4}-\d{2}-\d{2})/i);
    const title = titleMatch?.[1]?.trim().replace(/\s*-\s*GOV\.UK\s*$/i, "") || fallbackTitle;
    const publicationDate = datetimeMatch?.[1] ?? new Date().toISOString().slice(0, 10);
    return { title, publicationDate, url };
  } catch {
    return {
      title: fallbackTitle,
      publicationDate: new Date().toISOString().slice(0, 10),
      url,
    };
  }
}

function toDate(value: string): Date {
  return new Date(value);
}

function financialYearToBounds(financialYear: string) {
  const [startYear, endShort] = financialYear.split("-");
  const start = new Date(`${startYear}-04-01T00:00:00.000Z`);
  const endYear = `20${endShort}`;
  const end = new Date(`${endYear}-03-31T23:59:59.999Z`);
  return { start, end };
}

async function upsertAuthorityAndSource(row: AnnualRow) {
  let authority;

  if (row.onsCode) {
    const existing = await db.authority.findFirst({
      where: {
        OR: [{ onsCode: row.onsCode }, { slug: row.slug }],
      },
    });

    if (existing) {
      authority = await db.authority.update({
        where: { id: existing.id },
        data: {
          onsCode: row.onsCode,
          name: row.authorityName,
          slug: row.slug,
          type: row.type,
          region: row.region,
          officialUrl: row.officialUrl,
        },
      });
    } else {
      authority = await db.authority.create({
        data: {
          onsCode: row.onsCode,
          name: row.authorityName,
          slug: row.slug,
          type: row.type,
          region: row.region,
          officialUrl: row.officialUrl,
        },
      });
    }
  } else {
    authority = await db.authority.upsert({
      where: { slug: row.slug },
      update: {
        name: row.authorityName,
        type: row.type,
        region: row.region,
        officialUrl: row.officialUrl,
      },
      create: {
        name: row.authorityName,
        slug: row.slug,
        type: row.type,
        region: row.region,
        officialUrl: row.officialUrl,
      },
    });
  }

  const source = await db.source.upsert({
    where: {
      authorityId_sourceType_baseUrl: {
        authorityId: authority.id,
        sourceType: SourceType.finance_reports,
        baseUrl: row.evidenceUrl,
      },
    },
    update: {
      scope: SourceScope.central,
      sourceFormat: "html",
      parserName: "ingest-mhclg",
      status: "active",
      provenancePublisher: row.provenancePublisher,
      provenanceDataset: row.provenanceDataset,
      provenanceUrl: row.evidenceUrl,
      lastFetchedAt: new Date(),
    },
    create: {
      authorityId: authority.id,
      scope: SourceScope.central,
      sourceType: SourceType.finance_reports,
      baseUrl: row.evidenceUrl,
      sourceFormat: "html",
      parserName: "ingest-mhclg",
      status: "active",
      provenancePublisher: row.provenancePublisher,
      provenanceDataset: row.provenanceDataset,
      provenanceUrl: row.evidenceUrl,
      lastFetchedAt: new Date(),
    },
  });

  return { authority, source };
}

async function writeAnnualEvidence(row: AnnualRow) {
  const parsed = annualRowSchema.parse(row);
  const { start, end } = financialYearToBounds(parsed.financialYear);
  const { authority, source } = await upsertAuthorityAndSource(parsed);

  await db.document.upsert({
    where: {
      authorityId_layer_url_periodLabel: {
        authorityId: authority.id,
        layer: DataLayer.annual_baseline,
        url: parsed.evidenceUrl,
        periodLabel: parsed.financialYear,
      },
    },
    update: {
      sourceId: source.id,
      layer: DataLayer.annual_baseline,
      title: parsed.evidenceTitle,
      publicationDate: toDate(parsed.publicationDate),
      periodKind: PeriodKind.annual,
      periodLabel: parsed.financialYear,
      periodStart: start,
      periodEnd: end,
      provenancePublisher: parsed.provenancePublisher,
    },
    create: {
      authorityId: authority.id,
      sourceId: source.id,
      layer: DataLayer.annual_baseline,
      title: parsed.evidenceTitle,
      url: parsed.evidenceUrl,
      format: "html",
      publicationDate: toDate(parsed.publicationDate),
      periodKind: PeriodKind.annual,
      periodLabel: parsed.financialYear,
      periodStart: start,
      periodEnd: end,
      provenancePublisher: parsed.provenancePublisher,
    },
  });

  const freshnessDays = Math.max(
    0,
    Math.floor((Date.now() - toDate(parsed.asOfDate).getTime()) / (24 * 60 * 60 * 1000)),
  );

  await db.annualBaselineSnapshot.upsert({
    where: {
      authorityId_financialYear: {
        authorityId: authority.id,
        financialYear: parsed.financialYear,
      },
    },
    update: {
      netRevenueBudget: parsed.netRevenueBudget,
      reservesLevel: parsed.reservesLevel,
      debtLevel: parsed.debtLevel,
      explanation: `Annual finance record from ${parsed.provenancePublisher} (${parsed.provenanceDataset}) for ${parsed.financialYear}. This is a central-government source and may not include all authority-level breakdown fields.`,
      sourceUrl: parsed.evidenceUrl,
      coverageStatus: parsed.coverageStatus ?? "partial",
      confidenceScore: parsed.confidenceScore,
      freshnessDays,
      recordedAt: toDate(parsed.asOfDate),
    },
    create: {
      authorityId: authority.id,
      financialYear: parsed.financialYear,
      netRevenueBudget: parsed.netRevenueBudget,
      reservesLevel: parsed.reservesLevel,
      debtLevel: parsed.debtLevel,
      explanation: `Annual finance record from ${parsed.provenancePublisher} (${parsed.provenanceDataset}) for ${parsed.financialYear}. This is a central-government source and may not include all authority-level breakdown fields.`,
      sourceUrl: parsed.evidenceUrl,
      coverageStatus: parsed.coverageStatus ?? "partial",
      confidenceScore: parsed.confidenceScore,
      freshnessDays,
      recordedAt: toDate(parsed.asOfDate),
    },
  });
}

async function main() {
  const sourceEvidence = await fetchGovUkSourceEvidence(
    ANNUAL_SOURCE_URL,
    "Local authority revenue expenditure and financing (England)",
  );
  const authorities = await db.authority.findMany({ orderBy: { name: "asc" } });
  const financialYear = currentFinancialYear();
  const [startYear, endShort] = financialYear.split("-");
  const asOfDate = `20${endShort}-03-31`;

  const rows: AnnualRow[] = authorities.map((authority) => ({
    authorityName: authority.name,
    onsCode: authority.onsCode ?? undefined,
    slug: authority.slug,
    type: authority.type,
    region: authority.region,
    officialUrl: authority.officialUrl ?? undefined,
    financialYear,
    netRevenueBudget: null,
    reservesLevel: null,
    debtLevel: null,
    publicationDate: sourceEvidence.publicationDate,
    asOfDate,
    evidenceTitle: sourceEvidence.title,
    evidenceUrl: sourceEvidence.url,
    provenancePublisher: "MHCLG / GOV.UK",
    provenanceDataset: "Local authority revenue expenditure and financing (England)",
    confidenceScore: 35,
    coverageStatus: "minimal",
  }));

  for (const row of rows) {
    await writeAnnualEvidence(row);
  }

  console.log(`Upserted annual central evidence for ${rows.length} authorities from ${sourceEvidence.url}.`);
}

main()
  .catch((error) => {
    console.error("MHCLG annual baseline ingestion failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
