import { CsvDeliveryRow } from "@/lib/types";

export function parseDeliveryCsv(csv: string): CsvDeliveryRow[] {
  const [header, ...rows] = csv.split(/\r?\n/).filter(Boolean);
  if (!header) return [];
  const cols = header.split(",").map((v) => v.trim());

  return rows.map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    cols.forEach((c, i) => {
      row[c] = values[i] ?? "";
    });

    return {
      restaurant_name: row.restaurant_name,
      address: row.address,
      postcode: row.postcode,
      provider: (row.provider || "uber_eats") as CsvDeliveryRow["provider"],
      rating: row.rating ? Number(row.rating) : undefined,
      review_count: row.review_count ? Number(row.review_count) : undefined,
      source_url: row.source_url,
      last_updated: row.last_updated,
    };
  });
}
