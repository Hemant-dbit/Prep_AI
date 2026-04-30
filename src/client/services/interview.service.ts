import { apiRequest } from "@/client/lib/apiClient";

export const interviewService = {
  create: (data: {
    jobRole: string;
    jobDescription: string;
    experienceYears: number;
    resumeFileName?: string;
    existingResumeId?: string;
  }) => apiRequest("/api/interview/create", { method: "POST", body: data }),

  getQuestions: (sessionId: string) =>
    apiRequest(`/api/interview/questions?sessionId=${sessionId}`),

  submitAnswer: (sessionId: string, questionId: string, answer: string) =>
    apiRequest("/api/interview/answer", {
      method: "POST",
      body: { sessionId, questionId, answer },
    }),

  finish: (sessionId: string) =>
    apiRequest("/api/interview/finish", { method: "POST", body: { sessionId } }),

  terminate: (sessionId: string, reason: string, warningCount: number) =>
    apiRequest("/api/interview/terminate", {
      method: "POST",
      body: { sessionId, reason, warningCount },
    }),

  getResults: (interviewId: string) =>
    apiRequest(`/api/interview/${interviewId}`),

  getCompleted: () =>
    apiRequest("/api/interview/completed"),

  reattempt: (originalSessionId: string) =>
    apiRequest("/api/interview/reattempt", {
      method: "POST",
      body: { originalSessionId },
    }),

  getSession: (sessionId: string) =>
    apiRequest(`/api/interview/sessions?sessionId=${sessionId}`),
};
