// ─── Resume Types ─────────────────────────────────────────────────────────────

export interface ResumeExperience {
  company: string;
  position: string;
  duration: string;
  description: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  duration?: string;
  link?: string;
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  field: string;
  year: string;
}

export interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  summary: string;
}

export interface ResumeDetails {
  id: string;
  fileName: string;
  uploadedAt: string;
  parsedData: ParsedResumeData;
}

// ─── Interview Types ──────────────────────────────────────────────────────────

export interface QuestionResult {
  questionId: string;
  questionText: string;
  order?: number;
  answer: string | null;
  score: number | null;
  feedback: string | null;
  strengths: string | null;
  improvements: string | null;
  submittedAt: string | null;
}

export interface InterviewResults {
  sessionId: string;
  jobRole: string;
  experienceLevel: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  overallScore: number;
  grade: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
  questionResults: QuestionResult[];
  jobDescription?: unknown;
  candidateInfo?: unknown;
}

export interface InterviewSession {
  id: string;
  userId: string;
  status: "ACTIVE" | "COMPLETED" | "TERMINATED";
  score?: number;
  feedback?: string;
  createdAt: Date;
  endedAt?: Date;
  jd?: {
    parsedData?: {
      jobRole?: string;
      experienceLevel?: number;
      skills?: string[];
    };
  };
  resume?: {
    parsedData?: ParsedResumeData;
  };
  questions: {
    id: string;
    questionText: string;
    order: number;
  }[];
  answers: {
    id: string;
    questionId: string;
    candidateAnswer: string;
    submittedAt: Date;
    score?: number;
    feedback?: string;
    strengths?: string;
    improvements?: string;
  }[];
}

// ─── Question Types ───────────────────────────────────────────────────────────

export type QuestionCategory = "frontend" | "backend" | "devops" | "mobile";

export interface GeneratedQuestion {
  text: string;
  type: "technical" | "behavioral";
  difficulty: "easy" | "medium" | "hard";
  focus_area: string;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface DecodedToken {
  userId: string;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}

// ─── User Types ───────────────────────────────────────────────────────────────

export interface UsageStats {
  interviewsCompleted: number;
  questionsAnswered: number;
  averageScore: number;
  resumesUploaded: number;
}
