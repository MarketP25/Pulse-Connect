import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Detect region from Edge headers (standard on Vercel/Cloudflare)
  // We build a hierarchical path: COUNTRY-SUBDIVISION-CITY
  const country =
    request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "GLOBAL";
  const region_level1 = request.headers.get("x-vercel-ip-country-region") || "UNKNOWN";
  const city = request.headers.get("x-vercel-ip-city") || "DEFAULT";

  // This allows the catalog to match at the most specific level available
  // e.g., "US-NY-NYC", "KE-NRB-NAIROBI", or "FR-UNKNOWN-DEFAULT"
  const region = `${country}-${region_level1}-${city}`.toUpperCase();

  const response = NextResponse.next();

  // Set a custom header so Server Components can access the detected region
  response.headers.set("x-pulsco-region", region);

  return response;
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)"
};
