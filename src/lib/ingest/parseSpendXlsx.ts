import * as XLSX from "xlsx";
import { z } from "zod";
import { ParsedSpendRow } from "@/lib/ingest/parseSpendCsv";

const xlsxRowSchema = z.object({
  date: z.date().nullable(),
  supplier: z.string().min(1),
  amount: z.number(),
  serviceArea: z.string().optional(),
  description: z.string().optional(),
});

function parseDate(input: unknown): Date | null {
  if (!input) return null;
  const parsed = new Date(String(input));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseAmount(input: unknown): number {
  const parsed = Number(String(input ?? 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseSpendXlsx(buffer: Buffer): ParsedSpendRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[firstSheetName],
    { defval: "" },
  );

  return rawRows
    .map((row) =>
      xlsxRowSchema.safeParse({
        date: parseDate(row.Date ?? row.date ?? row.TransactionDate),
        supplier: String(row.Supplier ?? row.Payee ?? row.Creditor ?? "Unknown supplier"),
        amount: parseAmount(row.Amount ?? row.Value ?? row.Expenditure),
        serviceArea: String(row.ServiceArea ?? row.Department ?? "") || undefined,
        description: String(row.Description ?? row.Details ?? "") || undefined,
      }),
    )
    .flatMap((result) => (result.success ? [result.data] : []));
}
