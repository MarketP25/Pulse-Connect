export interface GeocodeResult {
  latitude: number;
  longitude: number;
  source: "proximity" | "fallback";
  formattedAddress?: string;
}

const DEFAULT_COORDS: Record<string, { latitude: number; longitude: number }> = {
  "Austin, US": { latitude: 30.2672, longitude: -97.7431 },
  "Seattle, US": { latitude: 47.6062, longitude: -122.3321 },
  "New York, US": { latitude: 40.7128, longitude: -74.006 },
  "Nairobi, KE": { latitude: -1.2921, longitude: 36.8219 },
  "San Francisco, US": { latitude: 37.7749, longitude: -122.4194 }
};

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function fallbackForAddress(address: string): GeocodeResult {
  const coords = DEFAULT_COORDS[address] || DEFAULT_COORDS["San Francisco, US"];
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    source: "fallback",
    formattedAddress: address
  };
}

function parseGeocodePayload(payload: Record<string, unknown>): GeocodeResult | null {
  const latFromRoot = payload.lat;
  const lngFromRoot = payload.lng;

  if (typeof latFromRoot === "number" && typeof lngFromRoot === "number") {
    return {
      latitude: latFromRoot,
      longitude: lngFromRoot,
      source: "proximity",
      formattedAddress:
        typeof payload.formatted_address === "string" ? payload.formatted_address : undefined
    };
  }

  const data = payload.data as Record<string, unknown> | undefined;
  if (data && typeof data.lat === "number" && typeof data.lng === "number") {
    return {
      latitude: data.lat,
      longitude: data.lng,
      source: "proximity",
      formattedAddress:
        typeof data.formatted_address === "string" ? data.formatted_address : undefined
    };
  }

  return null;
}

export async function geocodeWithProximity(address: string): Promise<GeocodeResult> {
  const baseUrl =
    process.env.PULSCO_PROXIMITY_API_URL ||
    process.env.PROXIMITY_API_URL ||
    "http://localhost:3002/api/v1/proximity";

  const endpoint = `${normalizeBaseUrl(baseUrl)}/geocode`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-actor-id": "dashboard-service",
        "x-subsystem": "localization",
        "x-request-id": `geo-${Date.now()}`,
        "x-policy-version": "1.0.0"
      },
      cache: "no-store",
      body: JSON.stringify({
        address,
        purpose: "localization",
        reasonCode: "CSI_GATEWAY_ACCESS"
      })
    });

    if (!response.ok) {
      return fallbackForAddress(address);
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseGeocodePayload(payload);
    return parsed || fallbackForAddress(address);
  } catch {
    return fallbackForAddress(address);
  }
}
