import { Severity, SignalCategory } from "@prisma/client";

const PHRASE_RULES: Array<{ phrase: RegExp; category: SignalCategory; severity: Severity; weight: number; title: string }> = [
  { phrase: /section\s*114/i, category: "governance_history", severity: "high", weight: 30, title: "Section 114 reference" },
  { phrase: /overspend/i, category: "current_warning", severity: "high", weight: 15, title: "Overspend reported" },
  { phrase: /reserve depletion|reserves depleted/i, category: "structural", severity: "high", weight: 12, title: "Reserve depletion" },
  { phrase: /unfunded pressure|uncontained pressure/i, category: "current_warning", severity: "medium", weight: 10, title: "Unfunded pressure" },
  { phrase: /capital financing pressure/i, category: "structural", severity: "medium", weight: 8, title: "Capital financing pressure" },
  { phrase: /savings shortfall/i, category: "current_warning", severity: "medium", weight: 10, title: "Savings shortfall" },
];

export interface ExtractedSignal {
  category: SignalCategory;
  severity: Severity;
  title: string;
  evidenceText: string;
  weight: number;
}

export function extractSignals(text: string): ExtractedSignal[] {
  const signals: ExtractedSignal[] = [];
  for (const rule of PHRASE_RULES) {
    const match = text.match(rule.phrase);
    if (!match) continue;
    signals.push({
      category: rule.category,
      severity: rule.severity,
      title: rule.title,
      evidenceText: text.slice(Math.max(0, match.index! - 100), match.index! + 140),
      weight: rule.weight,
    });
  }
  return signals;
}
