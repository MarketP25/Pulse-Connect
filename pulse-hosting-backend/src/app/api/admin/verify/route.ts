import { NextRequest } from "next/server";
import { verifyAdminUser } from "@/lib/services/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return new Response(
        JSON.stringify({
          error: "Verification code is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email } = await verifyAdminUser(code);

    // Redirect to success page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/admin/verification-success?email=${encodeURIComponent(email)}`,
      },
    });
  } catch (error) {
    console.error("Admin verification error:", error);

    // Redirect to error page
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/verification-error",
      },
    });
  }
}
