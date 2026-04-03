import { z } from "zod";
import * as XLSX from "xlsx";
import { ParsedSpendRow } from "@/lib/ingest/parseSpendCsv";

const xlsxRowSchema = z.object({
  date: z.coerce.date().nullable(),
  supplier: z.string().min(1),
  amount: z.number(),
  serviceArea: z.string().optional(),
  description: z.string().optional(),
});

export function parseSpendXlsx(buffer: Buffer): ParsedSpendRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const first = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(wb.Sheets[first], { defval: "" });

  return rows.map((r) => {
    const dateRaw = (r.Date || r.date || r.TransactionDate || "") as string;
    const supplierRaw = (r.Supplier || r.Payee || "Unknown supplier") as string;
    const amountRaw = Number(r.Amount || r.Value || r.Expenditure || 0);
    return xlsxRowSchema.parse({
      date: dateRaw ? new Date(String(dateRaw)) : null,
      supplier: String(supplierRaw),
      amount: Number.isFinite(amountRaw) ? amountRaw : 0,
      serviceArea: (r.ServiceArea || r.Department || undefined) as string | undefined,
      description: (r.Description || r.Details || undefined) as string | undefined,
    });
  });
}
