import { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminUser } from "@/lib/services/admin";
import { sendVerificationEmail } from "@/lib/email/templates/admin-verification";

const adminRegistrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  acceptTerms: z.literal(true, {
    message: "You must accept the terms and conditions"
  })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = adminRegistrationSchema.parse(body);

    const { verificationCode } = await createAdminUser(
      {
        email: validatedData.email,
        fullName: validatedData.fullName,
        password: validatedData.password
      },
      "ADMIN" // ✅ Required second argument
    );

    await sendVerificationEmail(validatedData.email, verificationCode);

    return new Response(
      JSON.stringify({
        message: "Registration successful. Please check your email for verification."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: error.issues
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as any).code === "MAX_ADMINS_REACHED"
    ) {
      return new Response(
        JSON.stringify({
          error: "Maximum number of admins reached"
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as any).code === "EMAIL_ALREADY_EXISTS"
    ) {
      return new Response(
        JSON.stringify({
          error: "An account with this email already exists"
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    console.error("Admin registration error:", error);
    return new Response(
      JSON.stringify({
        error: "Registration failed. Please try again later."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
