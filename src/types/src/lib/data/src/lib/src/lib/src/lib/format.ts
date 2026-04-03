export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `\u00a3${(value / 1_000_000_000).toFixed(1)}bn`;
  if (Math.abs(value) >= 1_000_000) return `\u00a3${(value / 1_000_000).toFixed(0)}m`;
  if (Math.abs(value) >= 1_000) return `\u00a3${(value / 1_000).toFixed(0)}k`;
  return `\u00a3${value.toFixed(0)}`;
}

export function formatChange(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}
