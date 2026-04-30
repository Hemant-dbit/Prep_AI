"use client";

import { AuthProvider } from "@/client/context/AuthContext";
import { Toaster } from "react-hot-toast";

export function AuthProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 6000,
          style: {
            background: "#363636",
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "600px",
          },
          success: {
            duration: 3000,
          },
          loading: {
            duration: 8000,
            iconTheme: {
              primary: "#3b82f6",
              secondary: "#fff",
            },
          },
        }}
      />
    </AuthProvider>
  );
}
