import { apiRequest } from "@/client/lib/apiClient";

export const authService = {
  login: (email: string, password: string) =>
    apiRequest("/api/auth/login", { method: "POST", body: { email, password } }),

  signup: (email: string, password: string, name: string) =>
    apiRequest("/api/auth/signup", { method: "POST", body: { email, password, name } }),

  logout: () =>
    apiRequest("/api/auth/logout", { method: "POST" }),

  me: () =>
    apiRequest("/api/auth/me"),

  forgotPassword: (email: string) =>
    apiRequest("/api/auth/forgot-password", { method: "POST", body: { email } }),

  validateResetToken: (token: string, email: string) =>
    apiRequest("/api/auth/validate-reset-token", { method: "POST", body: { token, email } }),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest("/api/auth/reset-password", { method: "POST", body: { token, newPassword } }),
};
