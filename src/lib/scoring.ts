import { StressBand } from "@/types/finance";

export function getBand(score: number): StressBand {
  if (score >= 70) return "Critical";
  if (score >= 50) return "Elevated";
  if (score >= 30) return "Guarded";
  return "Low";
}

export function getBandColor(band: StressBand): string {
  switch (band) {
    case "Critical": return "text-red-600 bg-red-50 border-red-200";
    case "Elevated": return "text-amber-600 bg-amber-50 border-amber-200";
    case "Guarded": return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "Low": return "text-green-600 bg-green-50 border-green-200";
  }
}

export function getBandDot(band: StressBand): string {
  switch (band) {
    case "Critical": return "bg-red-500";
    case "Elevated": return "bg-amber-500";
    case "Guarded": return "bg-yellow-500";
    case "Low": return "bg-green-500";
  }
}
