import type { NextRequest } from "next/server";

export interface PingGeoLocation {
  latitude: number;
  longitude: number;
}

function parseCoord(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  return null;
}

function isValidGeo(latitude: number, longitude: number): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function geoFromVercelHeaders(request: NextRequest): PingGeoLocation | null {
  const latitude = parseCoord(request.headers.get("x-vercel-ip-latitude"));
  const longitude = parseCoord(request.headers.get("x-vercel-ip-longitude"));
  if (latitude === null || longitude === null) return null;
  if (!isValidGeo(latitude, longitude)) return null;
  return { latitude, longitude };
}

async function geoFromIpApi(ip: string): Promise<PingGeoLocation | null> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      status?: string;
      lat?: number;
      lon?: number;
    };
    if (data.status !== "success") return null;
    if (typeof data.lat !== "number" || typeof data.lon !== "number") return null;
    if (!isValidGeo(data.lat, data.lon)) return null;

    return { latitude: data.lat, longitude: data.lon };
  } catch {
    return null;
  }
}

/**
 * Resolve approximate node location from the ping request.
 * Production (Vercel): x-vercel-ip-latitude / x-vercel-ip-longitude headers.
 * Local/dev fallback: ip-api.com lookup from client IP.
 */
export async function resolvePingGeoFromRequest(
  request: NextRequest,
): Promise<PingGeoLocation | null> {
  const fromVercel = geoFromVercelHeaders(request);
  if (fromVercel) return fromVercel;

  const ip = getClientIp(request);
  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;

  return geoFromIpApi(ip);
}
