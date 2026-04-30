"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { PageLoading, ButtonLoading } from "@/components/ui/Loading";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/home/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    toast.loading("Logging in...", { id: "login-progress" });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Update AuthContext with login data
        login(data.data.token, data.data.user);

        toast.success(" Login successful! Welcome back!", {
          id: "login-progress",
        });
        router.push("/home/dashboard");
      } else {
        toast.error(data.message || " Login failed. Please try again.", {
          id: "login-progress",
        });
        setErrorMessage(data.message || "Login failed. Please try again.");
      }
    } catch (error) {
      toast.error(
        "❌ Network error. Please check your connection and try again.",
        { id: "login-progress" }
      );
      setErrorMessage(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth status
  if (authLoading) {
    return <PageLoading text="Checking authentication..." />;
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white bg-opacity-20">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold">Login to your account</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter your email below to login to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="p-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              suppressHydrationWarning
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <a href="/forgot-password" className="text-xs hover:underline">
                Forgot your password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              className="p-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              suppressHydrationWarning
            />
          </div>

          {errorMessage && (
            <p className="text-red-500 text-sm font-medium">{errorMessage}</p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full p-2 rounded-lg text-white font-medium ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-black hover:bg-gray-800"
              }`}
              suppressHydrationWarning
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <ButtonLoading />
                  <span>Logging in...</span>
                </div>
              ) : (
                "Login"
              )}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                // Redirect to server endpoint that starts Google OAuth
                window.location.href = "/api/auth/google";
              }}
              className="w-full p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
              suppressHydrationWarning
            >
              Continue with Google
            </button>
          </div>

          <p className="text-center text-sm mt-4">
            New here?{" "}
            <a href="/signup" className="text-blue-600 hover:underline">
              Sign Up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
