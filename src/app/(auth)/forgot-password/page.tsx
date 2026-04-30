"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { authService } from "@/client/services/auth.service";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    toast.loading("Sending reset email...", { id: "forgot-password" });

    try {
      const data: any = await authService.forgotPassword(email);

      if (data.success) {
        if (data.resetUrl) {
          setResetUrl(data.resetUrl);
          toast.success("Reset link generated!", { id: "forgot-password" });
        } else {
          toast.success("Password reset email sent! Check your inbox.", { id: "forgot-password" });
        }
        setEmailSent(true);
      } else {
        if (data.isNewEmail) {
          toast.error(data.message, { id: "forgot-password", duration: 6000 });
          router.push("/signup");
        } else {
          toast.error(data.message || "Failed to send reset email.", { id: "forgot-password" });
        }
      }
    } catch {
      toast.error("Network error. Please try again.", { id: "forgot-password" });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {resetUrl ? "Reset Link Generated" : "Check Your Email"}
            </h2>
            {resetUrl ? (
              <>
                <p className="text-gray-600 mb-4">
                  <span className="text-orange-600 font-semibold">
                    Development Mode:
                  </span>{" "}
                  Click the link below to reset your password for{" "}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 mb-2">Reset Link:</p>
                  <a
                    href={resetUrl}
                    className="text-blue-600 hover:text-blue-800 text-sm break-all underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {resetUrl}
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  We've sent a password reset link to{" "}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
              </>
            )}
            <div className="space-y-3">
              <button
                onClick={() => setEmailSent(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
              >
                Try Different Email
              </button>
              <Link
                href="/login"
                className="block w-full px-4 py-2 text-sm font-medium text-center text-blue-600 hover:text-blue-500 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Forgot Password</h2>
          <p className="text-gray-600 mt-2">
            Enter your email address and we'll send you a link to reset your
            password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              suppressHydrationWarning
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-black cursor-pointer text-white"
            }`}
            suppressHydrationWarning
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
