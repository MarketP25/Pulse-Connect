"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminAuthClient, LoginRequest, VerifyCodeRequest } from "@pulsco/admin-auth-client";
import { Button, Input, Card, Alert, LoadingSpinner } from "@pulsco/admin-ui-core";
import { ADMIN_EMAILS } from "@pulsco/admin-shared-types";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");

  const router = useRouter();

  useEffect(() => {
    // Generate device fingerprint on mount
    setDeviceFingerprint(AdminAuthClient.generateDeviceFingerprint());
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const authClient = new AdminAuthClient({
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
      sessionDurationMinutes: 15,
      codeExpirySeconds: 60,
      maxRetries: 3
    });

    try {
      const request: LoginRequest = {
        email: email.trim(),
        deviceFingerprint
      };

      const response = await authClient.initiateLogin(request);

      if (response.success && response.requiresCode) {
        setStep("code");
      } else {
        setError(response.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const authClient = new AdminAuthClient({
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
      sessionDurationMinutes: 15,
      codeExpirySeconds: 60,
      maxRetries: 3
    });

    try {
      const request: VerifyCodeRequest = {
        email: email.trim(),
        code: code.trim(),
        deviceFingerprint
      };

      const response = await authClient.verifyCode(request);

      if (response.success && response.session) {
        // Store session in localStorage
        localStorage.setItem("admin_session", JSON.stringify(response.session));

        // Redirect to appropriate dashboard
        const role = response.session.role;
        router.push(`/${role}-dashboard`);
      } else {
        setError(response.error || "Verification failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = ADMIN_EMAILS[email as keyof typeof ADMIN_EMAILS] !== undefined;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Pulsco Admin Governance
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Secure access to governance dashboards
          </p>
        </div>

        <Card className="p-8">
          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Admin Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pulsco.global"
                  required
                  className="mt-1"
                />
                {email && !isValidEmail && (
                  <p className="mt-1 text-sm text-red-600">Invalid admin email address</p>
                )}
              </div>

              {error && <Alert type="error">{error}</Alert>}

              <Button
                type="submit"
                disabled={loading || !email || !isValidEmail}
                className="w-full"
              >
                {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Send Access Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Code sent to <strong>{email}</strong>
                </p>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Access Code
                </label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                  className="mt-1"
                  maxLength={6}
                />
              </div>

              {error && <Alert type="error">{error}</Alert>}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("email")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading || code.length !== 6} className="flex-1">
                  {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                  Verify Code
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
