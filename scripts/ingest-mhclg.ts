/**
 * ingest-mhclg.ts
 * Downloads the MHCLG Revenue Outturn time-series CSV and upserts
 * financial signals + score snapshots for every matched authority.
 *
 * CSV source (19.6 MB, updated Dec 2025):
 * https://assets.publishing.service.gov.uk/media/6937fe05e447374889cd8f4b/Revenue_Outturn_time_series_data_v3.1.csv
 */

import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

const CSV_URL =
  "https://assets.publishing.service.gov.uk/media/6937fe05e447374889cd8f4b/Revenue_Outturn_time_series_data_v3.1.csv";

// Only process the latest year to keep CI fast
const LATEST_YEAR_ONLY = process.env.MHCLG_ALL_YEARS !== "true";

interface MhclgRow {
  year_ending: string;
  ONS_code: string;
  LA_name: string;
  LA_class: string;
  status: string;
  // Key financial columns (values in £000s)
  RG_grantintot_tot_grant: string; // total grants in
  RG_grantouttot_tot_grant: string; // total grants out
  RG_granttot_tot_grant: string; // net grants total
  [key: string]: string;
}

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

async function main() {
  console.log("Fetching MHCLG Revenue Outturn CSV...");
  const res = await fetch(CSV_URL, {
    headers: { "User-Agent": "CouncilFinanceRadar/1.0" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);

  const text = await res.text();
  console.log(`Downloaded ${(text.length / 1024 / 1024).toFixed(1)} MB`);

  const records: MhclgRow[] = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  console.log(`Parsed ${records.length} rows`);

  // Get all authorities from DB
  const authorities = await prisma.authority.findMany();
  const slugMap = new Map(authorities.map((a) => [a.slug, a]));
  console.log(`${authorities.length} authorities in DB`);

  // Filter to individual councils (skip "total" rows and subtotals)
  let rows = records.filter(
    (r) =>
      r.status === "submitted" &&
      r.ONS_code &&
      !r.ONS_code.match(/^E\d{2}$/) // skip category totals like E06, E07
  );

  // Optionally filter to latest year
  if (LATEST_YEAR_ONLY) {
    const years = [...new Set(rows.map((r) => r.year_ending))].sort();
    const latest = years[years.length - 1];
    console.log(`Filtering to latest year: ${latest}`);
    rows = rows.filter((r) => r.year_ending === latest);
  }

  console.log(`Processing ${rows.length} council-year rows`);

  let matched = 0;
  let signalsCreated = 0;
  let snapshotsCreated = 0;

  for (const row of rows) {
    const slug = slugify(row.LA_name);
    const authority = slugMap.get(slug);
    if (!authority) continue;
    matched++;

    const grantsIn = parseAmount(row.RG_grantintot_tot_grant);
    const grantsOut = parseAmount(row.RG_grantouttot_tot_grant);
    const netGrants = parseAmount(row.RG_granttot_tot_grant);
    const yearStr = row.year_ending; // e.g. "202503"
    const year = parseInt(yearStr.substring(0, 4));
    const detectedAt = new Date(`${year}-03-31`);

    // Create a structural signal for grant dependency
    const grantDependencyRatio =
      grantsIn > 0 && netGrants !== 0
        ? Math.abs(grantsOut / grantsIn)
        : 0;

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
        evidenceText: `Grants in: £${(grantsIn * 1000).toLocaleString()}, Grants out: £${(grantsOut * 1000).toLocaleString()}, Net: £${(netGrants * 1000).toLocaleString()}`,
        sourceUrl: "https://www.gov.uk/government/statistics/local-authority-revenue-expenditure-and-financing-england-revenue-outturn-multi-year-data-set",
        weight: severity === "high" ? 3 : severity === "medium" ? 2 : 1,
        detectedAt,
      },
    });
    signalsCreated++;

    // Create a score snapshot from available data
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
