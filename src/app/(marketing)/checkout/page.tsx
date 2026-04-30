"use client";
import { useAuth } from "@/client/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { userService } from "@/client/services/user.service";

export default function Checkout() {
  const { updateUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgradeToPro = async () => {
    try {
      setLoading(true);
      await userService.upgradeToPro();
      updateUser({ isPremium: true });
      router.push("/home/dashboard");
    } catch {
      console.error("Error upgrading to pro");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-lg text-center border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Checkout</h1>
        <p className="text-gray-600 mb-8">
          Upgrade to <span className="font-semibold">Pro Plan</span> and enjoy
          exclusive benefits.
        </p>

        <div className="mb-8">
          <p className="text-2xl font-semibold text-gray-900">
            <span className="line-through text-gray-400 mr-2">$29</span>
            <span className="text-green-600 text-3xl font-bold">$0</span>
          </p>
          <p className="text-gray-500 mt-2 italic">
            🎁 Limited-time offer — upgrade for free!
          </p>
        </div>

        <ul className="text-left space-y-3 mb-8">
          <li className="flex items-center text-gray-700">
            <svg
              className="w-5 h-5 text-green-500 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            10 Mock Interviews/month
          </li>
          <li className="flex items-center text-gray-700">
            <svg
              className="w-5 h-5 text-green-500 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            AI-Powered Feedback
          </li>
          <li className="flex items-center text-gray-700">
            <svg
              className="w-5 h-5 text-green-500 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Advanced Analytics & Priority Support
          </li>
        </ul>

        <button
          onClick={handleUpgradeToPro}
          disabled={loading}
          className={`w-full py-3 rounded-md font-medium transition-colors cursor-pointer ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {loading ? "Processing..." : "Upgrade Now (Free)"}
        </button>

        <p className="text-gray-500 text-sm mt-6">
          By upgrading, you agree to our{" "}
          <a href="#" className="text-blue-600 underline">
            Terms & Conditions
          </a>
          .
        </p>
      </div>
    </div>
  );
}
