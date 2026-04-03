import { SourceFormat } from "@prisma/client";
import { db } from "@/lib/db";
import { discoverLinks } from "@/lib/ingest/discoverLinks";
import { parseSpendCsv } from "@/lib/ingest/parseSpendCsv";
import { parseSpendXlsx } from "@/lib/ingest/parseSpendXlsx";
import { parsePdfReport } from "@/lib/ingest/parsePdfReport";
import { extractSignals } from "@/lib/ingest/extractSignals";
import { scoreAuthority, tallySignalCategories } from "@/lib/ingest/scoreAuthority";

async function fetchBuffer(url: string) {
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

export async function runIngestion() {
  const run = await db.ingestionRun.create({ data: {} });
  const errors: string[] = [];

  try {
    const authorities = await db.authority.findMany({ include: { sources: true } });
    for (const authority of authorities) {
      const activeSources = authority.sources.filter((s) => s.status === "active");

      for (const source of activeSources) {
        try {
          if (source.sourceFormat === "html") {
            const links = await discoverLinks(source.baseUrl);
            for (const link of [...links.reportLinks, ...links.spendLinks]) {
              await db.document.upsert({
                where: { authorityId_url: { authorityId: authority.id, url: link } },
                create: {
                  authorityId: authority.id,
                  sourceId: source.id,
                  title: link.split("/").pop() || "Untitled",
                  url: link,
                  format: link.endsWith(".pdf") ? "pdf" : link.endsWith(".csv") ? "csv" : link.endsWith(".xlsx") || link.endsWith(".xls") ? "xlsx" : "html",
                },
                update: {},
              });
            }
          }
        } catch (err) {
          errors.push(`${authority.slug}: source discovery failed for ${source.baseUrl} (${String(err)})`);
        }
      }

      const docs = await db.document.findMany({ where: { authorityId: authority.id } });
      for (const doc of docs) {
        try {
          if (doc.format === SourceFormat.csv) {
            const text = await fetch(doc.url).then((r) => r.text());
            const rows = parseSpendCsv(text);
            for (const row of rows) {
              await db.spendTransaction.create({ data: { authorityId: authority.id, date: row.date, supplier: row.supplier, amount: row.amount, serviceArea: row.serviceArea, description: row.description, sourceUrl: doc.url } });
            }
          }
          if (doc.format === SourceFormat.xlsx || doc.format === SourceFormat.xls) {
            const buffer = await fetchBuffer(doc.url);
            const rows = parseSpendXlsx(buffer);
            for (const row of rows) {
              await db.spendTransaction.create({ data: { authorityId: authority.id, date: row.date, supplier: row.supplier, amount: row.amount, serviceArea: row.serviceArea, description: row.description, sourceUrl: doc.url } });
            }
          }
          if (doc.format === SourceFormat.pdf) {
            const buffer = await fetchBuffer(doc.url);
            const text = await parsePdfReport(buffer);
            await db.document.update({ where: { id: doc.id }, data: { extractedText: text } });
            const signals = extractSignals(text);
            for (const signal of signals) {
              await db.signal.create({
                data: {
                  authorityId: authority.id,
                  documentId: doc.id,
                  category: signal.category,
                  severity: signal.severity,
                  title: signal.title,
                  evidenceText: signal.evidenceText,
                  sourceUrl: doc.url,
                  weight: signal.weight,
                  detectedAt: new Date(),
                },
              });
            }
          }
        } catch (err) {
          errors.push(`${authority.slug}: parsing failed for ${doc.url} (${String(err)})`);
        }
      }

      const latestSignals = await db.signal.findMany({ where: { authorityId: authority.id } });
      const components = tallySignalCategories(latestSignals.map((s) => ({ category: s.category, weight: s.weight })));
      const score = scoreAuthority({
        ...components,
        hasRecentWarning: latestSignals.some((s) => Date.now() - s.detectedAt.getTime() < 30 * 24 * 60 * 60 * 1000),
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
    }

    const topSignals = await db.signal.findMany({ orderBy: { detectedAt: "desc" }, take: 6, include: { authority: true } });
    const today = new Date();
    await db.dailyBriefing.upsert({
      where: { briefingDate: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) },
      create: {
        briefingDate: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
        headline: topSignals.length ? `${topSignals[0].authority.name}: ${topSignals[0].title}` : "No new high-severity signals detected today",
        body: topSignals.length
          ? topSignals.map((s) => `${s.authority.name}: ${s.title}`).join("; ")
          : "No signals extracted from configured sources. Add or fix source registry coverage.",
      },
      update: {},
    });

    await db.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: errors.length ? "partial" : "success",
        authoritiesCount: await db.authority.count(),
        documentsCount: await db.document.count(),
        spendRowsCount: await db.spendTransaction.count(),
        contractsCount: await db.contractAward.count(),
        signalsCount: await db.signal.count(),
        errors,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    await db.ingestionRun.update({ where: { id: run.id }, data: { status: "failed", errors: [String(err)], completedAt: new Date() } });
    throw err;
  }

  return db.ingestionRun.findUnique({ where: { id: run.id } });
}
