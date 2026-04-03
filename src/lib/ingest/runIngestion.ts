import { SourceFormat } from "@prisma/client";
import { db } from "@/lib/db";
import { discoverLinks } from "@/lib/ingest/discoverLinks";
import { extractSignals } from "@/lib/ingest/extractSignals";
import { parsePdfReport } from "@/lib/ingest/parsePdfReport";
import { parseSpendCsv } from "@/lib/ingest/parseSpendCsv";
import { parseSpendXlsx } from "@/lib/ingest/parseSpendXlsx";
import { scoreAuthority, tallySignalCategories } from "@/lib/ingest/scoreAuthority";

const USER_AGENT =
  "CouncilFinanceRadar/1.0 (+https://github.com/jono8001/council; transparency research bot)";

const FETCH_TIMEOUT_MS = 30_000; // 30 seconds per fetch
const MAX_DOCS_PER_AUTHORITY = 20; // Limit documents parsed per authority to keep CI fast
const MAX_DISCOVERED_LINKS = 50; // Limit discovered links stored per source

function detectFormat(url: string): SourceFormat {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".csv")) return SourceFormat.csv;
  if (pathname.endsWith(".xlsx")) return SourceFormat.xlsx;
  if (pathname.endsWith(".xls")) return SourceFormat.xls;
  if (pathname.endsWith(".pdf")) return SourceFormat.pdf;
  return SourceFormat.html;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        ...init?.headers,
      },
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`Failed fetch (${response.status}) for ${url}`);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetchWithTimeout(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetchWithTimeout(url);
  return response.text();
}

export async function runIngestion() {
  const run = await db.ingestionRun.create({ data: { status: "running" } });
  const errors: string[] = [];

  try {
    const authorities = await db.authority.findMany({ include: { sources: true } });

    for (const authority of authorities) {
      const activeSources = authority.sources.filter((source) => source.status === "active");

      for (const source of activeSources) {
        if (source.sourceFormat !== SourceFormat.html) continue;

        try {
          const links = await discoverLinks(source.baseUrl);
          // Limit discovered links to avoid overwhelming the DB and CI
          const spendLinks = links.spendLinks.slice(0, MAX_DISCOVERED_LINKS);
          const reportLinks = links.reportLinks.slice(0, MAX_DISCOVERED_LINKS);
          const procurementLinks = links.procurementLinks.slice(0, MAX_DISCOVERED_LINKS);
          const discovered = [...spendLinks, ...reportLinks, ...procurementLinks];

          console.log(`${authority.slug}: discovered ${discovered.length} links from ${source.baseUrl}`);

          for (const link of discovered) {
            await db.document.upsert({
              where: { authorityId_url: { authorityId: authority.id, url: link } },
              update: { sourceId: source.id, format: detectFormat(link) },
              create: {
                authorityId: authority.id,
                sourceId: source.id,
                title: link.split("/").filter(Boolean).pop() ?? "Untitled",
                url: link,
                format: detectFormat(link),
              },
            });
          }

          await db.source.update({
            where: { id: source.id },
            data: { lastFetchedAt: new Date() },
          });
        } catch (error) {
          errors.push(`${authority.slug}: discovery failed for ${source.baseUrl} (${String(error)})`);
        }
      }

      // Only parse downloadable documents (CSV, XLSX, PDF), limited per authority
      const documents = await db.document.findMany({
        where: {
          authorityId: authority.id,
          format: { not: SourceFormat.html },
        },
        take: MAX_DOCS_PER_AUTHORITY,
      });

      console.log(`${authority.slug}: parsing ${documents.length} documents`);

      for (const document of documents) {
        try {
          if (document.format === SourceFormat.csv) {
            const text = await fetchText(document.url);
            const rows = parseSpendCsv(text);
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
            console.log(`${authority.slug}: parsed ${rows.length} spend rows from ${document.url}`);
          }

          if (document.format === SourceFormat.xlsx || document.format === SourceFormat.xls) {
            const buffer = await fetchBuffer(document.url);
            const rows = parseSpendXlsx(buffer);
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
            console.log(`${authority.slug}: parsed ${rows.length} spend rows from ${document.url}`);
          }

          if (document.format === SourceFormat.pdf) {
            const buffer = await fetchBuffer(document.url);
            const extractedText = await parsePdfReport(buffer);
            await db.document.update({
              where: { id: document.id },
              data: { extractedText },
            });

            const signals = extractSignals(extractedText);
            await db.signal.deleteMany({
              where: { authorityId: authority.id, documentId: document.id },
            });
            for (const signal of signals) {
              await db.signal.create({
                data: {
                  authorityId: authority.id,
                  documentId: document.id,
                  category: signal.category,
                  severity: signal.severity,
                  title: signal.title,
                  evidenceText: signal.evidenceText,
                  sourceUrl: document.url,
                  weight: signal.weight,
                  detectedAt: new Date(),
                },
              });
            }
            console.log(`${authority.slug}: extracted ${signals.length} signals from ${document.url}`);
          }
        } catch (error) {
          errors.push(`${authority.slug}: parsing failed for ${document.url} (${String(error)})`);
        }
      }

      // Score authority
      const signals = await db.signal.findMany({ where: { authorityId: authority.id } });
      const scoreBuckets = tallySignalCategories(
        signals.map((s) => ({ category: s.category, weight: s.weight })),
      );
      const score = scoreAuthority({
        ...scoreBuckets,
        hasRecentWarning: signals.some(
          (s) => Date.now() - s.detectedAt.getTime() <= 30 * 24 * 60 * 60 * 1000,
        ),
        spendSpike: false,
      });

      await db.scoreSnapshot.create({
        data: {
          authorityId: authority.id,
          structural: score.structural,
          currentWarning: score.currentWarning,
          spendPattern: score.spendPattern,
          procurement: score.procurement,
          governanceHistory: score.governanceHistory,
          overall: score.overall,
          band: score.band,
          explanation: score.explanation,
          borrowingIndicator: score.borrowingIndicator,
          reservesSignal: score.reservesSignal,
          publicationStatus: score.publicationStatus,
        },
      });

      console.log(`${authority.slug}: scored ${score.overall} (${score.band})`);
    }

    // Daily briefing
    const topSignals = await db.signal.findMany({
      orderBy: { detectedAt: "desc" },
      take: 6,
      include: { authority: true },
    });
    const today = new Date();
    const utcDateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    await db.dailyBriefing.upsert({
      where: { briefingDate: utcDateOnly },
      update: {
        headline: topSignals.length
          ? `${topSignals[0].authority.name}: ${topSignals[0].title}`
          : "No new high-severity signals detected today",
        body: topSignals.length
          ? topSignals.map((s) => `${s.authority.name}: ${s.title}`).join("; ")
          : "No signals extracted from configured sources.",
      },
      create: {
        briefingDate: utcDateOnly,
        headline: topSignals.length
          ? `${topSignals[0].authority.name}: ${topSignals[0].title}`
          : "No new high-severity signals detected today",
        body: topSignals.length
          ? topSignals.map((s) => `${s.authority.name}: ${s.title}`).join("; ")
          : "No signals extracted from configured sources.",
      },
    });

    // Final stats
    const [authCount, docCount, spendCount, contractCount, signalCount] = await Promise.all([
      db.authority.count(),
      db.document.count(),
      db.spendTransaction.count(),
      db.contractAward.count(),
      db.signal.count(),
    ]);

    console.log(`Ingestion complete: ${authCount} authorities, ${docCount} documents, ${spendCount} spend rows, ${signalCount} signals`);

    await db.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: errors.length ? "partial" : "success",
        authoritiesCount: authCount,
        documentsCount: docCount,
        spendRowsCount: spendCount,
        contractsCount: contractCount,
        signalsCount: signalCount,
        errors,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await db.ingestionRun.update({
      where: { id: run.id },
      data: { status: "failed", errors: [String(error)], completedAt: new Date() },
    });
    throw error;
  }

  return db.ingestionRun.findUnique({ where: { id: run.id } });
}
