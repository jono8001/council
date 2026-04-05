import { DataLayer, PeriodKind, SourceScope, SourceType } from "@prisma/client";
import { z } from "zod";
import { db } from "../src/lib/db";

const quarterlyRowSchema = z.object({
  authorityName: z.string().min(1),
  onsCode: z.string().regex(/^E\d{8}$/).optional(),
  slug: z.string().min(1),
  type: z.string().min(1),
  region: z.string().min(1),
  officialUrl: z.string().url().optional(),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/),
  quarter: z.number().int().min(1).max(4),
  budgetToDate: z.number().nullable(),
  outturnToDate: z.number().nullable(),
  varianceToDate: z.number().nullable(),
  publicationDate: z.string().datetime().or(z.string().date()),
  asOfDate: z.string().datetime().or(z.string().date()),
  evidenceTitle: z.string().min(1),
  evidenceUrl: z.string().url(),
  provenancePublisher: z.string().min(1),
  provenanceDataset: z.string().min(1),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  coverageStatus: z.enum(["full", "partial", "minimal", "none"]).optional(),
});

type QuarterlyRow = z.infer<typeof quarterlyRowSchema>;

const QUARTERLY_SOURCE_URL =
  "https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing";

function currentFinancialYearAndQuarter(): { financialYear: string; quarter: number; asOfDate: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endShort = (startYear + 1).toString().slice(2);
  const financialYear = `${startYear}-${endShort}`;

  const fiscalMonth = ((month + 8) % 12) + 1; // Apr => 1 ... Mar => 12
  const quarter = Math.max(1, Math.min(4, Math.ceil((fiscalMonth - 1) / 3)));
  const bounds = quarterBounds(financialYear, quarter);
  const asOfDate = bounds.end.toISOString().slice(0, 10);
  return { financialYear, quarter, asOfDate };
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

function quarterBounds(financialYear: string, quarter: number) {
  const [startYear, endShort] = financialYear.split("-");
  const fiscalStartYear = Number(startYear);
  const fiscalEndYear = Number(`20${endShort}`);

  const starts = [
    new Date(Date.UTC(fiscalStartYear, 3, 1)), // Q1 Apr-Jun
    new Date(Date.UTC(fiscalStartYear, 6, 1)), // Q2 Jul-Sep
    new Date(Date.UTC(fiscalStartYear, 9, 1)), // Q3 Oct-Dec
    new Date(Date.UTC(fiscalEndYear, 0, 1)), // Q4 Jan-Mar
  ];

  const ends = [
    new Date(Date.UTC(fiscalStartYear, 5, 30, 23, 59, 59, 999)),
    new Date(Date.UTC(fiscalStartYear, 8, 30, 23, 59, 59, 999)),
    new Date(Date.UTC(fiscalStartYear, 11, 31, 23, 59, 59, 999)),
    new Date(Date.UTC(fiscalEndYear, 2, 31, 23, 59, 59, 999)),
  ];

  return {
    start: starts[quarter - 1],
    end: ends[quarter - 1],
  };
}

async function upsertAuthorityAndSource(row: QuarterlyRow) {
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
      parserName: "ingest-quarterly",
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
      parserName: "ingest-quarterly",
      status: "active",
      provenancePublisher: row.provenancePublisher,
      provenanceDataset: row.provenanceDataset,
      provenanceUrl: row.evidenceUrl,
      lastFetchedAt: new Date(),
    },
  });

  return { authority, source };
}

async function writeQuarterlyEvidence(row: QuarterlyRow) {
  const parsed = quarterlyRowSchema.parse(row);
  const { start, end } = quarterBounds(parsed.financialYear, parsed.quarter);
  const { authority, source } = await upsertAuthorityAndSource(parsed);

  await db.document.upsert({
    where: {
      authorityId_layer_url_periodLabel: {
        authorityId: authority.id,
        layer: DataLayer.quarterly_update,
        url: parsed.evidenceUrl,
        periodLabel: `${parsed.financialYear}-Q${parsed.quarter}`,
      },
    },
    update: {
      sourceId: source.id,
      layer: DataLayer.quarterly_update,
      title: parsed.evidenceTitle,
      publicationDate: toDate(parsed.publicationDate),
      periodKind: PeriodKind.quarterly,
      periodLabel: `${parsed.financialYear}-Q${parsed.quarter}`,
      periodStart: start,
      periodEnd: end,
      provenancePublisher: parsed.provenancePublisher,
    },
    create: {
      authorityId: authority.id,
      sourceId: source.id,
      layer: DataLayer.quarterly_update,
      title: parsed.evidenceTitle,
      url: parsed.evidenceUrl,
      format: "html",
      publicationDate: toDate(parsed.publicationDate),
      periodKind: PeriodKind.quarterly,
      periodLabel: `${parsed.financialYear}-Q${parsed.quarter}`,
      periodStart: start,
      periodEnd: end,
      provenancePublisher: parsed.provenancePublisher,
    },
  });

  const freshnessDays = Math.max(
    0,
    Math.floor((Date.now() - toDate(parsed.asOfDate).getTime()) / (24 * 60 * 60 * 1000)),
  );

  await db.quarterlyPositionSnapshot.upsert({
    where: {
      authorityId_financialYear_quarter: {
        authorityId: authority.id,
        financialYear: parsed.financialYear,
        quarter: parsed.quarter,
      },
    },
    update: {
      budgetToDate: parsed.budgetToDate,
      outturnToDate: parsed.outturnToDate,
      varianceToDate: parsed.varianceToDate,
      explanation: `Quarterly finance record from ${parsed.provenancePublisher} (${parsed.provenanceDataset}) for ${parsed.financialYear} Q${parsed.quarter}. Authority-level quarterly values are currently limited in this ingest.`,
      sourceUrl: parsed.evidenceUrl,
      coverageStatus: parsed.coverageStatus ?? "partial",
      confidenceScore: parsed.confidenceScore,
      freshnessDays,
      recordedAt: toDate(parsed.asOfDate),
    },
    create: {
      authorityId: authority.id,
      financialYear: parsed.financialYear,
      quarter: parsed.quarter,
      budgetToDate: parsed.budgetToDate,
      outturnToDate: parsed.outturnToDate,
      varianceToDate: parsed.varianceToDate,
      explanation: `Quarterly finance record from ${parsed.provenancePublisher} (${parsed.provenanceDataset}) for ${parsed.financialYear} Q${parsed.quarter}. Authority-level quarterly values are currently limited in this ingest.`,
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
    QUARTERLY_SOURCE_URL,
    "Local authority revenue expenditure and financing (quarterly collection)",
  );
  const authorities = await db.authority.findMany({ orderBy: { name: "asc" } });
  const { financialYear, quarter, asOfDate } = currentFinancialYearAndQuarter();

  const rows: QuarterlyRow[] = authorities.map((authority) => ({
    authorityName: authority.name,
    onsCode: authority.onsCode ?? undefined,
    slug: authority.slug,
    type: authority.type,
    region: authority.region,
    officialUrl: authority.officialUrl ?? undefined,
    financialYear,
    quarter,
    budgetToDate: null,
    outturnToDate: null,
    varianceToDate: null,
    publicationDate: sourceEvidence.publicationDate,
    asOfDate,
    evidenceTitle: sourceEvidence.title,
    evidenceUrl: sourceEvidence.url,
    provenancePublisher: "MHCLG / GOV.UK",
    provenanceDataset: "Local authority revenue expenditure and financing (quarterly collection)",
    confidenceScore: 30,
    coverageStatus: "minimal",
  }));

  for (const row of rows) {
    await writeQuarterlyEvidence(row);
  }

  console.log(`Upserted quarterly central evidence for ${rows.length} authorities from ${sourceEvidence.url}.`);
}

main()
  .catch((error) => {
    console.error("Quarterly evidence ingestion failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
