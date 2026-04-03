import { Band, SignalCategory } from "@prisma/client";

export interface ScoreInput {
  structural: number;
  current_warning: number;
  spend_pattern: number;
  procurement: number;
  governance_history: number;
  hasRecentWarning: boolean;
  spendSpike: boolean;
}

export interface ScoreOutput {
  structural: number;
  currentWarning: number;
  spendPattern: number;
  procurement: number;
  governanceHistory: number;
  overall: number;
  band: Band;
  explanation: string;
  borrowingIndicator: string;
  reservesSignal: string;
  publicationStatus: string;
}

export function scoreAuthority(input: ScoreInput): ScoreOutput {
  const structural = Math.min(100, input.structural);
  const currentWarning = Math.min(100, input.current_warning + (input.hasRecentWarning ? 10 : 0));
  const spendPattern = Math.min(100, input.spend_pattern + (input.spendSpike ? 8 : 0));
  const procurement = Math.min(100, input.procurement);
  const governanceHistory = Math.min(100, input.governance_history);
  const overall = Math.min(100, Math.round(structural * 0.2 + currentWarning * 0.25 + spendPattern * 0.2 + procurement * 0.15 + governanceHistory * 0.2));
  const band: Band = overall >= 76 ? "Critical" : overall >= 51 ? "Elevated" : "Guarded";

  return {
    structural,
    currentWarning,
    spendPattern,
    procurement,
    governanceHistory,
    overall,
    band,
    explanation: `Score is based on structural (${structural}), current warning (${currentWarning}), spend pattern (${spendPattern}), procurement (${procurement}), governance history (${governanceHistory}).`,
    borrowingIndicator: structural >= 70 ? "High structural pressure" : "Moderate structural pressure",
    reservesSignal: structural >= 75 ? "Reserve risk elevated" : "No major reserve signal",
    publicationStatus: input.hasRecentWarning ? "On time" : "Coverage partial",
  };
}

export function tallySignalCategories(signals: Array<{ category: SignalCategory; weight: number }>) {
  return signals.reduce(
    (acc, s) => {
      acc[s.category] += s.weight;
      return acc;
    },
    { structural: 0, current_warning: 0, spend_pattern: 0, procurement: 0, governance_history: 0 },
  );
}
