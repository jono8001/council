import { DataLayer, PeriodKind, SourceFormat, SourceScope } from "@prisma/client";
import { db } from "@/lib/db";
import { discoverLinks } from "@/lib/ingest/discoverLinks";
import { parseSpendCsv } from "@/lib/ingest/parseSpendCsv";
import { parseSpendXlsx } from "@/lib/ingest/parseSpendXlsx";

function detectFormat(url: string): SourceFormat {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".csv")) return SourceFormat.csv;
  if (pathname.endsWith(".xlsx")) return SourceFormat.xlsx;
  if (pathname.endsWith(".xls")) return SourceFormat.xls;
  if (pathname.endsWith(".pdf")) return SourceFormat.pdf;
  return SourceFormat.html;
}

function inferPeriodFromUrl(url: string): {
  periodKind: PeriodKind;
  periodLabel?: string;
  periodStart?: Date;
  periodEnd?: Date;
} {
  const lower = url.toLowerCase();
  const monthMatch = lower.match(/(20\d{2})[-_\s]?(0[1-9]|1[0-2])/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return {
      periodKind: PeriodKind.monthly,
      periodLabel: `${year}-${String(month).padStart(2, "0")}`,
      periodStart: start,
      periodEnd: end,
    };
  }

  const fyMatch = lower.match(/(20\d{2})[-_/](\d{2})/);
  if (fyMatch) {
    const startYear = Number(fyMatch[1]);
    const endYear = Number(`20${fyMatch[2]}`);
    return {
      periodKind: PeriodKind.annual,
      periodLabel: `${startYear}-${String(endYear).slice(2)}`,
      periodStart: new Date(Date.UTC(startYear, 3, 1)),
      periodEnd: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)),
    };
  }

  return { periodKind: PeriodKind.ad_hoc };
}

function inferPublicationDateFromUrl(url: string): Date | null {
  const pathname = decodeURIComponent(new URL(url).pathname).toLowerCase();
  const basename = pathname.split("/").filter(Boolean).pop() ?? "";

  const dayPattern = /(?:^|[^\d])(20\d{2})[-_](0[1-9]|1[0-2])[-_](0[1-9]|[12]\d|3[01])(?:[^\d]|$)/;
  const monthPattern = /(?:^|[^\d])(20\d{2})[-_](0[1-9]|1[0-2])(?:[^\d]|$)/;

  for (const candidate of [basename, pathname]) {
    const dayMatch = candidate.match(dayPattern);
    if (dayMatch) {
      const year = Number(dayMatch[1]);
      const month = Number(dayMatch[2]);
      const day = Number(dayMatch[3]);
      return new Date(Date.UTC(year, month - 1, day));
    }

    const monthMatch = candidate.match(monthPattern);
    if (monthMatch) {
      const year = Number(monthMatch[1]);
      const month = Number(monthMatch[2]);
      return new Date(Date.UTC(year, month - 1, 1));
    }
  }

  return null;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed fetch (${response.status}) for ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed fetch (${response.status}) for ${url}`);
  }

  return response.text();
}

export async function runIngestion() {
  const run = await db.ingestionRun.create({ data: { status: "running" } });
  const errors: string[] = [];

  try {
    const authorities = await db.authority.findMany({
      include: { sources: { where: { sourceType: "transparency", status: "active" } } },
    });

    for (const authority of authorities) {
      const localSources = authority.sources.filter((source) => source.scope !== SourceScope.central);

      for (const source of localSources) {
        if (source.sourceFormat !== SourceFormat.html) continue;

        try {
          const links = await discoverLinks(source.baseUrl);
          const targetFiles = links.spendFileLinks.length > 0
            ? links.spendFileLinks
            : links.spendLinks.filter((link) => /\.(csv|xlsx|xls)$/i.test(new URL(link).pathname));

          for (const fileUrl of targetFiles) {
            const format = detectFormat(fileUrl);
            const period = inferPeriodFromUrl(fileUrl);
            const publicationDate = inferPublicationDateFromUrl(fileUrl);

            await db.document.upsert({
              where: {
                authorityId_layer_url_periodLabel: {
                  authorityId: authority.id,
                  layer: DataLayer.local_spend,
                  url: fileUrl,
                  periodLabel: period.periodLabel ?? null,
                },
              },
              update: {
                sourceId: source.id,
                layer: DataLayer.local_spend,
                format,
                title: fileUrl.split("/").filter(Boolean).pop() || "Untitled spend file",
                periodKind: period.periodKind,
                periodLabel: period.periodLabel,
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                provenancePublisher: source.provenancePublisher,
                publicationDate,
              },
              create: {
                authorityId: authority.id,
                sourceId: source.id,
                layer: DataLayer.local_spend,
                title: fileUrl.split("/").filter(Boolean).pop() || "Untitled spend file",
                url: fileUrl,
                format,
                periodKind: period.periodKind,
                periodLabel: period.periodLabel,
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                provenancePublisher: source.provenancePublisher,
                publicationDate,
              },
            });
          }

          await db.source.update({
            where: { id: source.id },
            data: { lastFetchedAt: new Date() },
          });
        } catch (error) {
          errors.push(`${authority.slug}: local spend discovery failed for ${source.baseUrl} (${String(error)})`);
        }
      }

      const spendDocuments = await db.document.findMany({
        where: {
          authorityId: authority.id,
          layer: DataLayer.local_spend,
          format: { in: [SourceFormat.csv, SourceFormat.xlsx, SourceFormat.xls] },
        },
      });

      for (const document of spendDocuments) {
        try {
          let rows: ReturnType<typeof parseSpendCsv> = [];

          if (document.format === SourceFormat.csv) {
            const text = await fetchText(document.url);
            rows = parseSpendCsv(text);
          }

          if (document.format === SourceFormat.xlsx || document.format === SourceFormat.xls) {
            const buffer = await fetchBuffer(document.url);
            rows = parseSpendXlsx(buffer);
          }

          await db.spendTransaction.deleteMany({
            where: { authorityId: authority.id, sourceUrl: document.url },
          });

          for (const row of rows) {
            await db.spendTransaction.create({
              data: {
                authorityId: authority.id,
                date: row.date,
                supplier: row.supplier,
                amount: row.amount,
                serviceArea: row.serviceArea,
                description: row.description,
                sourceUrl: document.url,
              },
            });
          }
        } catch (error) {
          errors.push(`${authority.slug}: local spend parse failed for ${document.url} (${String(error)})`);
        }
      }
    }

    const runStats = await Promise.all([
      db.authority.count(),
      db.document.count({ where: { layer: DataLayer.local_spend } }),
      db.spendTransaction.count(),
      db.contractAward.count(),
      db.signal.count(),
    ]);

    await db.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: errors.length ? "partial" : "success",
        authoritiesCount: runStats[0],
        documentsCount: runStats[1],
        spendRowsCount: runStats[2],
        contractsCount: runStats[3],
        signalsCount: runStats[4],
        errors,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await db.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errors: [String(error)],
        completedAt: new Date(),
      },
    });

    throw error;
  }

  return db.ingestionRun.findUnique({ where: { id: run.id } });
}
