import { apiRequest } from "@/client/lib/apiClient";

export const goalsService = {
  getAll: () =>
    apiRequest("/api/goals"),

  create: (data: {
    title: string;
    description?: string;
    category: string;
    targetDate: string;
  }) => apiRequest("/api/goals", { method: "POST", body: data }),

  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      targetDate?: string;
      completed?: boolean;
      progress?: number;
    }
  ) => apiRequest(`/api/goals/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    apiRequest(`/api/goals/${id}`, { method: "DELETE" }),
};
