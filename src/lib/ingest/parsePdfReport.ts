import pdfParse from "pdf-parse";

export async function parsePdfReport(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer);
  return parsed.text.replace(/\s+/g, " ").trim();
}
