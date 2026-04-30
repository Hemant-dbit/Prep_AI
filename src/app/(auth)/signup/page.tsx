"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { ButtonLoading } from "@/components/ui/Loading";
import { authService } from "@/client/services/auth.service";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    toast.loading("📝 Creating your account...", { id: "signup-progress" });

    try {
      const data: any = await authService.signup(email, password, name);

      if (data.success) {
        localStorage.setItem("authToken", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        toast.success("Account created successfully!");
        router.push("/home/dashboard");
      } else {
        const errorMsg =
          data.errors && data.errors.length > 0
            ? data.errors.map((err: any) => err.msg).join(", ")
            : data.message || "Signup failed. Please try again.";
        toast.error(` ${errorMsg}`, { id: "signup-progress" });
        setErrorMessage(errorMsg);
      }
    } catch {
      toast.error(" Network error. Please check your connection and try again.", { id: "signup-progress" });
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white bg-opacity-20">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold">Create an account</h2>
          <p className="text-sm text-gray-500 mt-1">
            Sign up with your details to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              className="p-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              suppressHydrationWarning
            />
          </div>

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
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
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
              className={`w-full p-2 rounded-lg text-white font-medium cursor-pointer ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-black hover:bg-gray-800"
              }`}
              suppressHydrationWarning
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <ButtonLoading />
                  <span>Creating account...</span>
                </div>
              ) : (
                "Create account"
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

          <p className="text-center text-sm mt-2">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              Login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
