import { z } from "zod";

const spendRowSchema = z.object({
  date: z.coerce.date().nullable(),
  supplier: z.string().min(1),
  amount: z.number(),
  serviceArea: z.string().optional(),
  description: z.string().optional(),
});

export type ParsedSpendRow = z.infer<typeof spendRowSchema>;

function parseDate(input: string | undefined) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseAmount(input: string | undefined) {
  if (!input) return 0;
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

export function parseSpendCsv(content: string): ParsedSpendRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const dateIdx = header.findIndex((h) => /date/.test(h));
  const supplierIdx = header.findIndex((h) => /supplier|payee/.test(h));
  const amountIdx = header.findIndex((h) => /amount|value|expenditure/.test(h));
  const areaIdx = header.findIndex((h) => /service|directorate|department/.test(h));
  const descIdx = header.findIndex((h) => /description|details|narrative/.test(h));

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return spendRowSchema.parse({
      date: parseDate(cols[dateIdx]),
      supplier: cols[supplierIdx] || "Unknown supplier",
      amount: parseAmount(cols[amountIdx]),
      serviceArea: areaIdx >= 0 ? cols[areaIdx] : undefined,
      description: descIdx >= 0 ? cols[descIdx] : undefined,
    });
  });
}
