import { apiRequest } from "@/client/lib/apiClient";

export const questionsService = {
  generate: (category: string) =>
    apiRequest("/api/questions/generate", { method: "POST", body: { category } }),
};
