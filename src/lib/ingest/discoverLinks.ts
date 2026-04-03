import * as cheerio from "cheerio";
import { z } from "zod";

const discoveredSchema = z.object({
  spendLinks: z.array(z.string().url()),
  reportLinks: z.array(z.string().url()),
  procurementLinks: z.array(z.string().url()),
});

export type DiscoveredLinks = z.infer<typeof discoveredSchema>;

function normalize(baseUrl: string, href: string) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export async function discoverLinks(baseUrl: string): Promise<DiscoveredLinks> {
  const html = await fetch(baseUrl).then((r) => r.text());
  const $ = cheerio.load(html);
  const spendLinks: string[] = [];
  const reportLinks: string[] = [];
  const procurementLinks: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().toLowerCase();
    const url = normalize(baseUrl, href);
    if (!url) return;

    if (/(spend|over\s*500|transparency)/i.test(text + href)) spendLinks.push(url);
    if (/(monitoring|budget|treasury|finance|report)/i.test(text + href)) reportLinks.push(url);
    if (/(contract|procurement|tender)/i.test(text + href)) procurementLinks.push(url);
  });

  return discoveredSchema.parse({
    spendLinks: [...new Set(spendLinks)],
    reportLinks: [...new Set(reportLinks)],
    procurementLinks: [...new Set(procurementLinks)],
  });
}
