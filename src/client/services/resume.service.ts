import { apiRequest, apiUpload } from "@/client/lib/apiClient";

export const resumeService = {
  getAll: () =>
    apiRequest("/api/resume/upload"),

  upload: (formData: FormData) =>
    apiUpload("/api/resume/upload", formData),

  getDetails: (id: string) =>
    apiRequest(`/api/resume/details/${id}`),

  delete: (id: string) =>
    apiRequest(`/api/resume/delete/${id}`, { method: "DELETE" }),

  analyze: (formData: FormData) =>
    apiUpload("/api/resume/analyze", formData),
};
