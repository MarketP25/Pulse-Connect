import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard"];
const publicPaths = ["/reviews", "/explore", "/places"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if public path
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check auth cookie
  const sessionToken = request.cookies.get("pulse-portal-session")?.value;
  const isGuest = !sessionToken;

  if (protectedPaths.some((path) => pathname.startsWith(path)) && isGuest) {
    const url = request.nextUrl.clone();
    url.pathname = "/register";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)"
  ]
};
