"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  name?: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  isPremium?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Run initialization async so we can await profile fetch before marking loading done
    const init = async () => {
      // Only access localStorage on client side
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      // If redirected from OAuth flow with token in hash (#token=...), extract and store it
      try {
        const hash = window.location.hash;
        if (hash && hash.startsWith("#token=")) {
          const tokenFromHash = decodeURIComponent(hash.replace("#token=", ""));
          // store token and remove fragment to clean URL
          localStorage.setItem("authToken", tokenFromHash);
          // we don't have user details here; leave user null and let app fetch profile if needed
          setToken(tokenFromHash);
          // Remove the fragment without reloading
          history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
        }
      } catch (err) {
        console.warn("Error parsing token from URL hash", err);
      }

      // Check for stored auth data on component mount
      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
        } catch (error) {
          console.error("Error parsing stored user data:", error);
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
        }
      } else if (storedToken && !storedUser) {
        // If we have a token but no stored user, fetch the profile to populate
        // the user object so the app stays authenticated after OAuth redirect.
        setToken(storedToken);
        try {
          const resp = await fetch("/api/auth/me", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${storedToken}`,
              "Content-Type": "application/json",
            },
          });
          const data = await resp.json();          if (data && data.success && data.data) {
            setUser(data.data);
            localStorage.setItem("user", JSON.stringify(data.data));
          } else {
            // token might be invalid; clear it
            localStorage.removeItem("authToken");
            setToken(null);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          localStorage.removeItem("authToken");
          setToken(null);
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    if (typeof window !== "undefined") {
      localStorage.setItem("authToken", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    }
  };
  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      const newUser = { ...prev, ...updatedFields } as User;
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(newUser));
      }
      return newUser;
    });
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
