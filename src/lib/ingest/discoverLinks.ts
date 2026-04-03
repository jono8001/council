import * as cheerio from "cheerio";
import { z } from "zod";

const discoveredSchema = z.object({
  spendLinks: z.array(z.string().url()),
  reportLinks: z.array(z.string().url()),
  procurementLinks: z.array(z.string().url()),
});

export type DiscoveredLinks = z.infer<typeof discoveredSchema>;

function normalizeUrl(baseUrl: string, href: string): string | null {
  try {
    const normalized = new URL(href, baseUrl);
    normalized.hash = "";
    return normalized.toString();
  } catch {
    return null;
  }
}

export async function discoverLinks(baseUrl: string): Promise<DiscoveredLinks> {
  const response = await fetch(baseUrl);
  if (!response.ok) {
    throw new Error(`Failed discovery fetch (${response.status}) for ${baseUrl}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const spendLinks = new Set<string>();
  const reportLinks = new Set<string>();
  const procurementLinks = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const text = $(element).text().toLowerCase();
    const normalized = normalizeUrl(baseUrl, href);
    if (!normalized) return;

    const corpus = `${href} ${text}`.toLowerCase();

    if (/(spend|over\s*500|transparency)/i.test(corpus)) {
      spendLinks.add(normalized);
    }

    if (/(monitoring|budget|treasury|finance|report)/i.test(corpus)) {
      reportLinks.add(normalized);
    }

    if (/(contract|procurement|tender|award)/i.test(corpus)) {
      procurementLinks.add(normalized);
    }
  });

  return discoveredSchema.parse({
    spendLinks: [...spendLinks],
    reportLinks: [...reportLinks],
    procurementLinks: [...procurementLinks],
  });
}
