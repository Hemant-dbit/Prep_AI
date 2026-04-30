"use client";

import NavBar from "@/components/navigation/NavBar";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/client/context/AuthContext";
import { useState, useEffect } from "react";
import Loading, { InlineLoading } from "@/components/ui/Loading";
import Pricing from "./(marketing)/pricing/page";

interface AnalyticsData {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  recentInterviews: Array<{
    id: string;
    score: number;
    startedAt: string;
    status: string;
    jdData?: any;
  }>;
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch analytics data when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalyticsData();
    }
  }, [isAuthenticated]);

  const fetchAnalyticsData = async () => {
    try {
      setAnalyticsLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/analytics", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.analytics);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleGoToSignup = () => {
    router.push("/signup");
  };

  const handleGoToLogin = () => {
    router.push("/login");
  };

  const handleGoToDashboard = () => {
    router.push("/home/dashboard");
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center h-[80vh]">
          <InlineLoading text="Loading..." />
        </div>
      </div>
    );
  }
  return (
    <>
      <NavBar />

      <div className="min-h-screen bg-gray-50">
        <AnimatePresence>
          <div className="relative">
            {/* Main Hero Section */}
            <div className="pt-32 pb-20 px-6">
              <div className="max-w-7xl mx-auto">
                {/* Announcement Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="flex justify-center mb-8"
                >
                  <button
                    onClick={() => {
                      const featuresSection =
                        document.getElementById("features");
                      if (featuresSection) {
                        featuresSection.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <span className="text-sm text-gray-600">
                      Introducing AI Mock Interviews
                    </span>
                    <span className="ml-2 text-sm text-blue-600 hover:text-blue-700">
                      Read more →
                    </span>
                  </button>
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="text-center text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6"
                >
                  Turn interviews into{" "}
                  <span className="text-blue-600">success</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="text-center text-xl text-gray-600 max-w-3xl mx-auto mb-12"
                >
                  PrepAI is the modern platform for tech interview preparation,
                  AI-powered practice sessions, and career advancement.
                </motion.p>

                {/* Welcome message for authenticated users */}
                {!isLoading && isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="text-center mb-8"
                  >
                    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg px-6 py-4 max-w-md mx-auto">
                      <p className="text-lg font-medium text-gray-900">
                        Welcome back, {user?.name || user?.email}! 👋
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Ready to continue your interview preparation?
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
                >
                  {isLoading ? (
                    // Show loading state to prevent hydration mismatch
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Loading
                        variant="pulse"
                        size="large"
                        className="h-12 w-32 rounded-md"
                      />
                      <Loading
                        variant="pulse"
                        size="large"
                        className="h-12 w-32 rounded-md"
                      />
                    </div>
                  ) : isAuthenticated ? (
                    // Show dashboard button when logged in
                    <button
                      className="bg-black cursor-pointer text-white px-8 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
                      onClick={handleGoToDashboard}
                    >
                      Go to Dashboard
                    </button>
                  ) : (
                    // Show signup and GitHub buttons when not logged in
                    <>
                      <button
                        className="bg-black cursor-pointer text-white px-8 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
                        onClick={handleGoToSignup}
                      >
                        Start for free
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            "https://github.com/patiladitya77/Prep-AI",
                            "_blank"
                          )
                        }
                        className="border border-gray-300 text-gray-700 px-8 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub
                      </button>
                    </>
                  )}
                </motion.div>

                {/* Feature Pills */}
                <motion.div
                  id="features"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="flex flex-wrap justify-center gap-4 mb-20"
                >
                  <button
                    onClick={() =>
                      isAuthenticated
                        ? handleGoToDashboard()
                        : handleGoToSignup()
                    }
                    className="bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm flex items-center hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group"
                  >
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 group-hover:animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">
                      AI Mock Interviews
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      const analyticsSection =
                        document.getElementById("analytics-preview");
                      if (analyticsSection) {
                        analyticsSection.scrollIntoView({ behavior: "smooth" });
                      } else if (isAuthenticated) {
                        handleGoToDashboard();
                      } else {
                        handleGoToSignup();
                      }
                    }}
                    className="bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm flex items-center hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 group-hover:animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-green-600">
                      Performance Analytics
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      isAuthenticated
                        ? handleGoToDashboard()
                        : handleGoToSignup()
                    }
                    className="bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm flex items-center hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group"
                  >
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 group-hover:animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600">
                      Career Programs
                    </span>
                  </button>
                </motion.div>

                {/* Dashboard Preview */}
                <motion.div
                  id="analytics-preview"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="relative max-w-6xl mx-auto"
                >
                  <button
                    onClick={() =>
                      isAuthenticated
                        ? handleGoToDashboard()
                        : handleGoToSignup()
                    }
                    className="group w-full cursor-pointer block"
                  >
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden group-hover:shadow-3xl transition-shadow duration-300">
                      {/* Mock Dashboard Header */}
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="font-semibold text-gray-900">
                            InterviewAI
                          </div>
                          <div className="text-sm text-gray-500">
                            Mock Interviews
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        </div>
                      </div>

                      {/* Dynamic Dashboard Content */}
                      <div className="p-8">
                        {analyticsLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loading size="medium" color="blue" />
                            <span className="ml-3 text-gray-600">
                              Loading analytics...
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                              <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                  Interviews Completed
                                </h3>
                                <p className="text-3xl font-bold text-blue-600">
                                  {isAuthenticated && analyticsData
                                    ? analyticsData.completedInterviews
                                    : "127"}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                  {isAuthenticated && analyticsData
                                    ? "Real-time data"
                                    : "Sample data - Sign up to track your progress"}
                                </p>
                              </div>
                              <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                  Average Score
                                </h3>
                                <p className="text-3xl font-bold text-green-600">
                                  {isAuthenticated && analyticsData
                                    ? `${Math.round(
                                        analyticsData.averageScore
                                      )}%`
                                    : "89%"}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                  {isAuthenticated && analyticsData
                                    ? "Your performance"
                                    : "Sample performance data"}
                                </p>
                              </div>
                              <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                  Total Sessions
                                </h3>
                                <p className="text-3xl font-bold text-purple-600">
                                  {isAuthenticated && analyticsData
                                    ? analyticsData.totalInterviews
                                    : "15"}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                  {isAuthenticated && analyticsData
                                    ? "All interview attempts"
                                    : "Including practice sessions"}
                                </p>
                              </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-lg">
                              <h3 className="font-semibold text-gray-900 mb-4">
                                Recent Interview Sessions
                              </h3>
                              <div className="space-y-3">
                                {isAuthenticated &&
                                analyticsData &&
                                analyticsData.recentInterviews.length > 0 ? (
                                  analyticsData.recentInterviews
                                    .slice(0, 3)
                                    .map((interview, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between bg-white p-3 rounded"
                                      >
                                        <span className="text-gray-700">
                                          {interview.jdData?.title ||
                                            `Interview Session #${interview.id.slice(
                                              -4
                                            )}`}
                                        </span>
                                        <span
                                          className={`px-2 py-1 rounded text-sm ${
                                            interview.status === "COMPLETED"
                                              ? "bg-green-100 text-green-800"
                                              : interview.status ===
                                                "IN_PROGRESS"
                                              ? "bg-blue-100 text-blue-800"
                                              : "bg-yellow-100 text-yellow-800"
                                          }`}
                                        >
                                          {interview.status === "COMPLETED"
                                            ? `Score: ${Math.round(
                                                interview.score || 0
                                              )}%`
                                            : interview.status.charAt(0) +
                                              interview.status
                                                .slice(1)
                                                .toLowerCase()
                                                .replace("_", " ")}
                                        </span>
                                      </div>
                                    ))
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between bg-white p-3 rounded">
                                      <span className="text-gray-700">
                                        {isAuthenticated
                                          ? "No interviews yet - Start your first session!"
                                          : "Software Engineer - Google"}
                                      </span>
                                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                        {isAuthenticated
                                          ? "Get Started"
                                          : "Passed"}
                                      </span>
                                    </div>
                                    {!isAuthenticated && (
                                      <>
                                        <div className="flex items-center justify-between bg-white p-3 rounded">
                                          <span className="text-gray-700">
                                            Frontend Developer - Meta
                                          </span>
                                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                            In Review
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between bg-white p-3 rounded">
                                          <span className="text-gray-700">
                                            Full Stack - Amazon
                                          </span>
                                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                            Passed
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </motion.div>
              </div>
            </div>

            {/* Pricing Section */}
            <div>
              <Pricing />
            </div>

            {/* Companies Section */}
            <div className="bg-gray-100 py-12">
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-8">
                  <p className="text-gray-600 text-sm mb-4">
                    Interview questions from top companies
                  </p>
                  <div className="flex items-center justify-center space-x-6 md:space-x-8 text-gray-700">
                    <span className="font-semibold text-lg">Google</span>
                    <span className="font-semibold text-lg">Meta</span>
                    <span className="font-semibold text-lg">Apple</span>
                    <span className="font-semibold text-lg">Amazon</span>
                    <span className="font-semibold text-lg hidden md:inline">
                      Microsoft
                    </span>
                    <span className="font-semibold text-lg hidden md:inline">
                      Netflix
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                  {/* Company Info */}
                  <div>
                    <h3 className="text-xl font-bold mb-4">PrepAI</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      The modern platform for tech interview preparation with
                      AI-powered practice sessions and career advancement.
                    </p>
                    <div className="flex space-x-4">
                      <button
                        onClick={() =>
                          window.open(
                            "https://github.com/patiladitya77/Prep-AI",
                            "_blank"
                          )
                        }
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </button>
                      <button className="text-gray-400 hover:text-white transition-colors">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                        </svg>
                      </button>
                      <button className="text-gray-400 hover:text-white transition-colors">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Product Links */}
                  <div>
                    <h4 className="font-semibold mb-4">Product</h4>
                    <ul className="space-y-2 text-sm">
                      <li>
                        <button
                          onClick={() =>
                            isAuthenticated
                              ? handleGoToDashboard()
                              : handleGoToSignup()
                          }
                          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Mock Interviews
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() =>
                            isAuthenticated
                              ? handleGoToDashboard()
                              : handleGoToSignup()
                          }
                          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Analytics
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            const pricingSection =
                              document.getElementById("pricing");
                            if (pricingSection) {
                              pricingSection.scrollIntoView({
                                behavior: "smooth",
                              });
                            }
                          }}
                          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Pricing
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() =>
                            window.open(
                              "https://github.com/patiladitya77/Prep-AI",
                              "_blank"
                            )
                          }
                          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          API
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Resources */}
                  <div>
                    <h4 className="font-semibold mb-4">Resources</h4>
                    <ul className="space-y-2 text-sm">
                      <li>
                        <button
                          onClick={() =>
                            window.open(
                              "https://github.com/patiladitya77/Prep-AI",
                              "_blank"
                            )
                          }
                          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Documentation
                        </button>
                      </li>
                      <li>
                        <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                          Help Center
                        </button>
                      </li>
                      <li>
                        <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                          Blog
                        </button>
                      </li>
                      <li>
                        <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                          Community
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Legal */}
                  <div>
                    <h4 className="font-semibold mb-4">Legal</h4>
                    <ul className="space-y-2 text-sm">
                      <li>
                        <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                          Privacy Policy
                        </button>
                      </li>
                      <li>
                        <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                          Terms of Service
                        </button>
                      </li>
                      <li>
                        <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                          Cookie Policy
                        </button>
                      </li>
                      <li>
                        <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                          Contact Us
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Bottom Footer */}
                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
                  <p className="text-gray-400 text-sm">
                    © 2025 PrepAI. All rights reserved.
                  </p>
                  <div className="flex items-center space-x-6 mt-4 md:mt-0">
                    <button className="text-gray-400 hover:text-white transition-colors text-sm cursor-pointer">
                      Status
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors text-sm cursor-pointer">
                      Careers
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors text-sm cursor-pointer">
                      Press
                    </button>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </AnimatePresence>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-8 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </motion.button>
        )}
      </div>
    </>
  );
}
