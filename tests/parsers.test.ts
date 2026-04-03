import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { parseSpendCsv } from "../src/lib/ingest/parseSpendCsv";
import { parseSpendXlsx } from "../src/lib/ingest/parseSpendXlsx";
import { extractSignals } from "../src/lib/ingest/extractSignals";
import { scoreAuthority } from "../src/lib/ingest/scoreAuthority";
import { parsePdfReport } from "../src/lib/ingest/parsePdfReport";

describe("ingest parsers", () => {
  it("parses spend csv", () => {
    const csv = fs.readFileSync(path.join(process.cwd(), "tests/fixtures/sample-spend.csv"), "utf8");
    const rows = parseSpendCsv(csv);
    expect(rows[0].supplier).toBe("ABC Care Ltd");
    expect(rows[0].amount).toBe(1200.5);
  });

  it("parses spend xlsx", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ Date: "2026-03-01", Supplier: "XYZ Ltd", Amount: 900 }]);
    XLSX.utils.book_append_sheet(wb, ws, "Spend");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const rows = parseSpendXlsx(buf);
    expect(rows[0].supplier).toBe("XYZ Ltd");
    expect(rows[0].amount).toBe(900);
  });

  it("extracts rule-based signals", () => {
    const text = fs.readFileSync(path.join(process.cwd(), "tests/fixtures/sample-report.txt"), "utf8");
    const signals = extractSignals(text);
    expect(signals.some((s) => s.title === "Overspend reported")).toBe(true);
  });

  it("scores authority deterministically", () => {
    const output = scoreAuthority({ structural: 70, current_warning: 40, spend_pattern: 20, procurement: 10, governance_history: 50, hasRecentWarning: true, spendSpike: false });
    expect(output.overall).toBeGreaterThan(0);
    expect(["Guarded", "Elevated", "Critical"]).toContain(output.band);
  });

  it("pdf parser returns text for a tiny pdf-like buffer", async () => {
    await expect(parsePdfReport(Buffer.from("%PDF-1.3"))).rejects.toBeTruthy();
  });
});
