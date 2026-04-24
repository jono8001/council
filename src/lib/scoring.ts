export function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function threatScore(params: {
  distanceMiles: number;
  radiusMiles: number;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  deliveryCoverageCount: number;
  avgDeliveryRating?: number | null;
}): number {
  const proximity = Math.max(0, 100 - (params.distanceMiles / params.radiusMiles) * 100);
  const googleRatingScore = ((params.googleRating ?? 0) / 5) * 100;
  const reviewVolumeScore = Math.min(100, ((params.googleReviewCount ?? 0) / 1500) * 100);
  const deliveryCoverage = (params.deliveryCoverageCount / 3) * 100;
  const deliveryRatingScore = ((params.avgDeliveryRating ?? 0) / 5) * 100;

  const weighted =
    proximity * 0.35 +
    googleRatingScore * 0.25 +
    reviewVolumeScore * 0.15 +
    deliveryCoverage * 0.15 +
    deliveryRatingScore * 0.1;

  return Math.round(Math.max(0, Math.min(100, weighted)));
}

export function threatBand(score: number): "Low" | "Medium" | "High" | "Very high" {
  if (score >= 75) return "Very high";
  if (score >= 55) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}
