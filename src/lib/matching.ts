function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export function confidenceFromMatch(input: {
  rowName: string;
  rowPostcode?: string;
  rowAddress?: string;
  compName: string;
  compPostcode?: string | null;
  compAddress?: string | null;
}): number {
  const rowName = normalizeText(input.rowName);
  const compName = normalizeText(input.compName);
  const samePostcode =
    (input.rowPostcode || "").toLowerCase().trim() !== "" &&
    (input.rowPostcode || "").toLowerCase().trim() === (input.compPostcode || "").toLowerCase().trim();

  if (rowName === compName && samePostcode) return 0.95;

  const partialName = rowName.includes(compName) || compName.includes(rowName);
  const addressOverlap = normalizeText(input.rowAddress || "").includes(
    normalizeText((input.compAddress || "").slice(0, 12)),
  );

  if (partialName && (samePostcode || addressOverlap)) return 0.7;
  if (partialName) return 0.45;
  return 0.2;
}

export function confidenceLabel(confidence: number): "High" | "Medium" | "Low" | "Unmatched" {
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.6) return "Medium";
  if (confidence >= 0.35) return "Low";
  return "Unmatched";
}
