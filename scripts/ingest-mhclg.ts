/**
 * ingest-mhclg.ts
 * Downloads the MHCLG Revenue Outturn time-series CSV and upserts
 * financial signals + score snapshots for every matched authority.
 *
 * No external CSV parser dependency - uses simple line splitting.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CSV_URL =
  "https://assets.publishing.service.gov.uk/media/6937fe05e447374889cd8f4b/Revenue_Outturn_time_series_data_v3.1.csv";

const LATEST_YEAR_ONLY = process.env.MHCLG_ALL_YEARS !== "true";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*ua$/i, "")
    .replace(/\s*borough council$/i, "")
    .replace(/\s*district council$/i, "")
    .replace(/\s*city council$/i, "")
    .replace(/\s*council$/i, "")
    .replace(/\s*dc$/i, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseAmount(val: string): number {
  if (!val || val === "Not set" || val === ".." || val === "") return 0;
  const n = parseFloat(val.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseCSV(rawText: string): Record<string, string>[] {
  // Strip BOM and normalize line endings
  const text = rawText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");
  if (lines.length < 2) return [];
  // Strip BOM and quotes from headers
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").replace(/^\uFEFF/, ""));
  console.log(`CSV headers (first 5): ${headers.slice(0, 5).join(", ")}`);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] || "").trim().replace(/^"|"$/g, "");
    }
    rows.push(row);
  }
  return rows;
}

async function main() {
  console.log("Fetching MHCLG Revenue Outturn CSV...");
  const res = await fetch(CSV_URL, {
    headers: { "User-Agent": "CouncilFinanceRadar/1.0" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);

  const text = await res.text();
  console.log(`Downloaded ${(text.length / 1024 / 1024).toFixed(1)} MB`);

  const records = parseCSV(text);
  console.log(`Parsed ${records.length} rows`);

  // Debug: show first record keys and sample
  if (records.length > 0) {
    const first = records[0];
    console.log(`First record keys: ${Object.keys(first).slice(0, 8).join(", ")}`);
    console.log(`First record status='${first.status}', LA_name='${first.LA_name}', year='${first.year_ending}'`);
  }

  const authorities = await prisma.authority.findMany();
  const slugMap = new Map(authorities.map((a) => [a.slug, a]));
  console.log(`${authorities.length} authorities in DB: ${authorities.map((a) => a.slug).join(", ")}`);

  // Filter to individual councils (skip total rows)
  let rows = records.filter(
    (r) =>
      r.status === "submitted" &&
      r.ONS_code &&
      !/^E\d{2}$/.test(r.ONS_code)
  );
  console.log(`After status filter: ${rows.length} rows (from ${records.length})`);

  if (LATEST_YEAR_ONLY && rows.length > 0) {
    const years = [...new Set(rows.map((r) => r.year_ending).filter(Boolean))].sort();
    const latest = years[years.length - 1];
    console.log(`Available years: ${years.join(", ")}`);
    console.log(`Filtering to latest year: ${latest}`);
    rows = rows.filter((r) => r.year_ending === latest);
  }

  console.log(`Processing ${rows.length} council-year rows`);

  // Debug: show first 3 slugs being tried
  for (const row of rows.slice(0, 3)) {
    const slug = slugify(row.LA_name || "");
    console.log(`Trying: '${row.LA_name}' -> slug '${slug}' -> match: ${slugMap.has(slug)}`);
  }

  let matched = 0;
  let signalsCreated = 0;
  let snapshotsCreated = 0;

  for (const row of rows) {
    const slug = slugify(row.LA_name || "");
    const authority = slugMap.get(slug);
    if (!authority) continue;
    matched++;

    const grantsIn = parseAmount(row.RG_grantintot_tot_grant);
    const grantsOut = parseAmount(row.RG_grantouttot_tot_grant);
    const netGrants = parseAmount(row.RG_granttot_tot_grant);
    const yearStr = row.year_ending || "202503";
    const year = parseInt(yearStr.substring(0, 4));
    const detectedAt = new Date(`${year}-03-31`);

    const grantDependencyRatio =
      grantsIn > 0 && netGrants !== 0 ? Math.abs(grantsOut / grantsIn) : 0;

    const severity =
      grantDependencyRatio > 0.5
        ? "high"
        : grantDependencyRatio > 0.3
        ? "medium"
        : "low";

    await prisma.signal.create({
      data: {
        authorityId: authority.id,
        category: "structural",
        severity: severity as any,
        title: `MHCLG Revenue Outturn ${year}`,
        evidenceText: `Grants in: ${grantsIn}k, Grants out: ${grantsOut}k, Net: ${netGrants}k`,
        sourceUrl:
          "https://www.gov.uk/government/statistics/local-authority-revenue-expenditure-and-financing-england-revenue-outturn-multi-year-data-set",
        weight: severity === "high" ? 3 : severity === "medium" ? 2 : 1,
        detectedAt,
      },
    });
    signalsCreated++;

    const band =
      grantDependencyRatio > 0.5
        ? "Critical"
        : grantDependencyRatio > 0.3
        ? "Elevated"
        : "Guarded";

    await prisma.scoreSnapshot.create({
      data: {
        authorityId: authority.id,
        structural: Math.min(100, Math.round(grantDependencyRatio * 100)),
        currentWarning: 0,
        spendPattern: 0,
        procurement: 0,
        governanceHistory: 0,
        overall: Math.min(100, Math.round(grantDependencyRatio * 50)),
        band: band as any,
        explanation: `Based on MHCLG Revenue Outturn ${year} data`,
        borrowingIndicator: grantsOut > grantsIn * 0.4 ? "elevated" : "normal",
        reservesSignal: "pending",
        publicationStatus: "published",
      },
    });
    snapshotsCreated++;
  }

  console.log(
    `Done: ${matched} councils matched, ${signalsCreated} signals, ${snapshotsCreated} snapshots created`
  );

  await prisma.$disconnect();
}

main()
  .then(() => console.log("MHCLG ingestion complete"))
  .catch((err) => {
    console.error("MHCLG ingestion failed:", err);
    process.exit(1);
  });
