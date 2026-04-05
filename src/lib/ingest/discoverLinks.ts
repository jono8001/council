import * as cheerio from "cheerio";
import { z } from "zod";

const discoveredSchema = z.object({
  spendFileLinks: z.array(z.string().url()),
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

function isDownloadableSpendFile(url: string, corpus: string) {
  const pathname = new URL(url).pathname.toLowerCase();
  const isFile = /\.(csv|xlsx|xls)$/i.test(pathname);
  const isSpendLike = /(spend|over\s*500|transparency|payments?)/i.test(corpus);
  return isFile && isSpendLike;
}

export async function discoverLinks(baseUrl: string): Promise<DiscoveredLinks> {
  const response = await fetch(baseUrl);
  if (!response.ok) {
    throw new Error(`Failed discovery fetch (${response.status}) for ${baseUrl}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const spendFileLinks = new Set<string>();
  const spendLinks = new Set<string>();
  const reportLinks = new Set<string>();
  const procurementLinks = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const text = $(element).text().toLowerCase();
    const normalized = normalizeUrl(baseUrl, href);
    if (!normalized) return;

    const corpus = `${href} ${text}`.toLowerCase();

    if (isDownloadableSpendFile(normalized, corpus)) {
      spendFileLinks.add(normalized);
    }

    if (/(spend|over\s*500|transparency|payments?)/i.test(corpus)) {
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
    spendFileLinks: [...spendFileLinks],
    spendLinks: [...spendLinks],
    reportLinks: [...reportLinks],
    procurementLinks: [...procurementLinks],
  });
}
