"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/client/context/AuthContext";
import { authService } from "@/client/services/auth.service";

// Import your NavBar component
const NavBar = () => {
  const router = useRouter();
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleGoToLogin = () => {
    router.push("/login");
  };

  const handleGoToSignup = () => {
    router.push("/signup");
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // logout is best-effort
    } finally {
      logout();
      setShowDropdown(false);
      router.push("/");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => router.push("/")}
          className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
        >
          PrepAI
        </button>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <div className="relative group">
            <button className="text-gray-600 hover:text-gray-900 transition-colors flex items-center">
              Practice
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {/* Practice Dropdown */}
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <a
                href={isAuthenticated ? "/home/dashboard" : "/signup"}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Mock Interviews
              </a>
            </div>
          </div>

          {/* Questions section temporarily commented out */}

          <button
            onClick={() => {
              if (isAuthenticated) {
                const analyticsSection =
                  document.getElementById("analytics-preview");
                if (analyticsSection) {
                  analyticsSection.scrollIntoView({ behavior: "smooth" });
                } else {
                  router.push("/");
                }
              } else {
                router.push("/signup");
              }
            }}
            className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Analytics
          </button>
          <button
            onClick={() => {
              // Scroll to pricing section if it exists, or go to a pricing page
              const pricingSection = document.getElementById("pricing");
              if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: "smooth" });
              } else {
                // For now, redirect to signup
                router.push("/signup");
              }
            }}
            className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Pricing
          </button>
        </div>

        {/* Auth Buttons / User Avatar */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            // Show loading state to prevent hydration mismatch
            <div className="flex items-center space-x-4">
              <div className="w-20 h-8 bg-gray-200 rounded-md animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
          ) : isAuthenticated ? (
            // Show user avatar and dropdown when logged in
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.name
                    ? getInitials(user.name)
                    : user?.email?.[0].toUpperCase() || "U"}
                </div>

                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      router.push("/home/dashboard");
                      setShowDropdown(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => {
                      router.push("/home/dashboard");
                      setShowDropdown(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    My Interviews
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Show login/signup buttons when not logged in
            <>
              <button
                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                onClick={handleGoToLogin}
              >
                Log in
              </button>
              <button
                className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={handleGoToSignup}
              >
                Sign up
              </button>
            </>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {showMobileMenu ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-6 py-4 space-y-4">
            <div>
              <a
                href={isAuthenticated ? "/home/dashboard" : "/signup"}
                className="block text-sm font-medium text-gray-900 hover:text-blue-600"
              >
                Mock Interviews
              </a>
            </div>

            {/* Questions section temporarily commented out */}

            <button
              onClick={() => {
                if (isAuthenticated) {
                  const analyticsSection =
                    document.getElementById("analytics-preview");
                  if (analyticsSection) {
                    analyticsSection.scrollIntoView({ behavior: "smooth" });
                  } else {
                    router.push("/");
                  }
                } else {
                  router.push("/signup");
                }
                setShowMobileMenu(false);
              }}
              className="block w-full text-left text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
            >
              Analytics
            </button>

            <button
              onClick={() => {
                const pricingSection = document.getElementById("pricing");
                if (pricingSection) {
                  pricingSection.scrollIntoView({ behavior: "smooth" });
                } else {
                  router.push("/signup");
                }
                setShowMobileMenu(false);
              }}
              className="block w-full text-left text-sm font-medium text-gray-900 hover:text-blue-600"
            >
              Pricing
            </button>

            {!isAuthenticated && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    router.push("/login");
                    setShowMobileMenu(false);
                  }}
                  className="block w-full text-left text-sm font-medium text-gray-900 hover:text-blue-600 mb-2"
                >
                  Log in
                </button>
                <button
                  onClick={() => {
                    router.push("/signup");
                    setShowMobileMenu(false);
                  }}
                  className="w-full bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
