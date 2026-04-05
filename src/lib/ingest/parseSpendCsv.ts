import { z } from "zod";

const spendRowSchema = z.object({
  date: z.date().nullable(),
  supplier: z.string().min(1),
  amount: z.number(),
  serviceArea: z.string().optional(),
  description: z.string().optional(),
});

export type ParsedSpendRow = z.infer<typeof spendRowSchema>;

function parseDate(input: string | undefined): Date | null {
  if (!input) return null;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseAmount(input: string | undefined): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function findColumnIndex(header: string[], patterns: RegExp[]): number {
  return header.findIndex((column) => patterns.some((pattern) => pattern.test(column)));
}

export function parseSpendCsv(content: string): ParsedSpendRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((column) => column.toLowerCase());
  const dateIndex = findColumnIndex(header, [/date/, /transaction\s*date/]);
  const supplierIndex = findColumnIndex(header, [/supplier/, /payee/, /creditor/]);
  const amountIndex = findColumnIndex(header, [/amount/, /value/, /expenditure/, /net\s*amount/]);
  const serviceAreaIndex = findColumnIndex(header, [/service/, /directorate/, /department/]);
  const descriptionIndex = findColumnIndex(header, [/description/, /details/, /narrative/]);

  if (supplierIndex < 0 || amountIndex < 0) return [];

  return lines
    .slice(1)
    .map((line) => {
      const columns = parseCsvLine(line);

      return spendRowSchema.safeParse({
        date: dateIndex >= 0 ? parseDate(columns[dateIndex]) : null,
        supplier: columns[supplierIndex] || "Unknown supplier",
        amount: parseAmount(columns[amountIndex]),
        serviceArea: serviceAreaIndex >= 0 ? columns[serviceAreaIndex] || undefined : undefined,
        description: descriptionIndex >= 0 ? columns[descriptionIndex] || undefined : undefined,
      });
    })
    .flatMap((result) => (result.success ? [result.data] : []));
}
