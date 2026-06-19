// Lightweight IP geolocation with an in-memory cache.
// Uses the free ip-api.com endpoint (no key). Private/invalid IPs return null.

export interface Geo {
  cc: string; // ISO country code, e.g. "SA"
  country: string; // "Saudi Arabia"
  lat: number;
  lon: number;
}

const cache = new Map<string, Geo | null>();

function isPrivate(ip: string) {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("127.") ||
    ip.startsWith("172.") || // covers docker 172.16-31 (good enough)
    ip === "unknown" ||
    ip.includes(":") === false && ip.split(".").length !== 4
  );
}

export async function lookupGeo(ip: string): Promise<Geo | null> {
  if (cache.has(ip)) return cache.get(ip) ?? null;
  if (isPrivate(ip)) {
    cache.set(ip, null);
    return null;
  }
  try {
    const r = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,countryCode,country,lat,lon`,
      { cache: "no-store" }
    );
    const d = (await r.json()) as {
      status: string;
      countryCode?: string;
      country?: string;
      lat?: number;
      lon?: number;
    };
    if (d.status !== "success" || !d.countryCode) {
      cache.set(ip, null);
      return null;
    }
    const g: Geo = {
      cc: d.countryCode,
      country: d.country ?? d.countryCode,
      lat: d.lat ?? 0,
      lon: d.lon ?? 0,
    };
    cache.set(ip, g);
    return g;
  } catch {
    cache.set(ip, null);
    return null;
  }
}

/** Enrich a list of {key: ip, count} with geo data (parallel, cached). */
export async function geoEnrich(items: { key: string; count: number }[]) {
  return Promise.all(
    items.map(async (x) => {
      const g = await lookupGeo(x.key);
      return { ...x, cc: g?.cc ?? "", country: g?.country ?? "", lat: g?.lat, lon: g?.lon };
    })
  );
}
