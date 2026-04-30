import { apiRequest } from "@/client/lib/apiClient";

export const userService = {
  getUsage: () =>
    apiRequest("/api/user/usage"),

  upgradeToPro: () =>
    apiRequest("/api/user/upgradetopro", { method: "POST" }),

  getAnalytics: () =>
    apiRequest("/api/analytics"),
};
