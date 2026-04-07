import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AdminAuthClient } from "@pulsco/admin-auth-client";

const authClient = new AdminAuthClient({
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  sessionDurationMinutes: 15,
  codeExpirySeconds: 60,
  maxRetries: 3
});

export async function middleware(request: NextRequest) {
  // Check if user is authenticated and has Commercial role
  try {
    const session = await authClient.validateSession();

    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session.role !== "commercial-outreach") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Add role context to headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-admin-role", session.role);
    response.headers.set("x-admin-email", session.email);
    response.headers.set("x-admin-id", session.adminId);

    return response;
  } catch (error) {
    console.error("Commercial middleware error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
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
