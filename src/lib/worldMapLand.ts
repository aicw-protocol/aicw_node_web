/** Rough region label from coordinates (for ticker display only). */
export function getRegionLabel(lat: number, lon: number): string {
  if (lat >= -44 && lat <= -10 && lon >= 110 && lon <= 180) return "Oceania";
  if (lat >= 12 && lat <= 42 && lon >= 25 && lon <= 62) return "Middle East";
  if (lat >= 35 && lat <= 72 && lon >= -25 && lon <= 45) return "Europe";
  if (lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52) return "Africa";
  if (lat >= -10 && lat <= 50 && lon >= 60 && lon <= 180) return "Asia-Pacific";
  if (lat >= -56 && lat <= 32 && lon >= -118 && lon <= -34) return "Americas";
  return "Global";
}

/** Rough land mask for a pixel world map (WGS84 lat/lng). Not survey-grade. */
export function isLand(lat: number, lon: number): boolean {
  const regions: Array<[number, number, number, number]> = [
    [15, 72, -168, -52],
    [50, 72, -168, -55],
    [60, 83, -55, -20],
    [7, 32, -118, -60],
    [-56, 13, -82, -34],
    [35, 71, -25, 45],
    [-35, 37, -18, 52],
    [12, 42, 25, 60],
    [5, 77, 40, 180],
    [-10, 45, 95, 145],
    [-10, 25, 95, 130],
    [30, 46, 129, 146],
    [-44, -10, 112, 154],
    [-47, -34, 166, 179],
    [50, 59, -11, 2],
    [63, 67, -25, -13],
    [-10, 6, 95, 140],
    [-26, -12, 43, 50],
  ];

  return regions.some(
    ([minLat, maxLat, minLon, maxLon]) =>
      lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon,
  );
}

export function projectLatLng(
  lat: number,
  lon: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 480;
export const LAND_PIXEL = 3;
export const NODE_PIXEL = 6;
