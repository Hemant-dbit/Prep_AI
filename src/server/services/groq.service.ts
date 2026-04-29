import Groq from "groq-sdk";

// Single shared Groq client instance
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: {
    company: string;
    position: string;
    duration: string;
    description: string;
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
    duration?: string;
    link?: string;
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    year: string;
  }[];
  summary: string;
}

export interface AnswerScore {
  score: number;
  feedback: string;
  strengths: string;
  improvements: string;
}

export interface AnsweredPair {
  question: { id: string; questionText: string };
  answer: { id: string; candidateAnswer: string; submittedAt: Date };
}

export interface ScoredAnswer extends AnswerScore {
  answerId: string;
  questionId: string;
  questionText: string;
  answer: string;
  submittedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generic chat completion — returns raw text response.
 */
export async function generateCompletion(prompt: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0].message.content ?? "";
}

/**
 * Safely extracts a JSON object from an AI response that may contain
 * surrounding text or markdown code fences.
 */
export function extractJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/**
 * Safely extracts a JSON array from an AI response.
 */
export function extractJSONArray<T>(text: string): T[] {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  return JSON.parse(cleaned.slice(start, end + 1)) as T[];
}

// ─── Resume ───────────────────────────────────────────────────────────────────

const RESUME_FALLBACK: ParsedResume = {
  name: "",
  email: "",
  phone: "",
  skills: [],
  experience: [],
  projects: [],
  education: [],
  summary: "Resume parsing failed, manual review required",
};

/**
 * Parses raw resume text into structured data using Groq AI.
 * Returns a fallback object if parsing fails.
 */
export async function parseResumeWithAI(resumeText: string): Promise<ParsedResume> {
  try {
    const prompt = `
You are an expert resume parser. Parse the following resume text and extract structured information.
Pay special attention to extracting projects, personal projects, academic projects, or any work projects mentioned.
Look for project names, descriptions, technologies used, and any links or repositories.

Resume Text: ${resumeText}

Return the response as a JSON object with this exact format:
{
  "name": "Candidate Name",
  "email": "email@example.com",
  "phone": "phone number",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "duration": "Start Date - End Date",
      "description": "Brief description of role"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description of the project",
      "technologies": ["tech1", "tech2", "tech3"],
      "duration": "Start Date - End Date (if available)",
      "link": "Project link/URL (if available)"
    }
  ],
  "education": [
    {
      "institution": "University/College Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "year": "Graduation Year"
    }
  ],
  "summary": "Brief professional summary"
}

If any field is not found, use empty string for strings, empty array for arrays.
Only return the JSON object, no additional text.
    `;

    const text = await generateCompletion(prompt);
    return extractJSON<ParsedResume>(text);
  } catch (error) {
    console.error("❌ AI resume parsing failed:", (error as Error)?.message || error);
    return RESUME_FALLBACK;
  }
}

// ─── Interview Scoring ────────────────────────────────────────────────────────

/**
 * Fallback scoring based on answer length when AI is unavailable.
 */
export function getFallbackScore(answer: string): AnswerScore {
  const answerLength = answer.trim().length;
  const wordCount = answer.trim().split(/\s+/).length;

  if (answerLength < 10) {
    return {
      score: 1,
      feedback: "Very brief response. Consider providing more detail.",
      strengths: "Response was submitted successfully.",
      improvements: "Expand your answer with specific examples and explanations.",
    };
  } else if (answerLength < 50 || wordCount < 10) {
    return {
      score: 3,
      feedback: "Short response with limited detail.",
      strengths: "Response was submitted successfully.",
      improvements: "Add more specific examples and elaborate on key points.",
    };
  } else if (answerLength < 150 || wordCount < 25) {
    return {
      score: 5,
      feedback: "Moderate response length with basic coverage.",
      strengths: "Provided a reasonable amount of detail.",
      improvements: "Consider adding specific examples and more comprehensive explanations.",
    };
  } else if (answerLength < 300 || wordCount < 50) {
    return {
      score: 7,
      feedback: "Well-developed response with good detail.",
      strengths: "Comprehensive answer with good structure.",
      improvements: "Continue providing detailed, well-structured responses.",
    };
  } else {
    return {
      score: 8,
      feedback: "Detailed and comprehensive response.",
      strengths: "Thorough and well-elaborated answer.",
      improvements: "Maintain this level of detail and specificity.",
    };
  }
}

/**
 * Scores all answered questions in a single batched Groq API call.
 * Falls back to length-based scoring if AI is unavailable or fails.
 */
export async function batchScoreAnswers(
  answeredPairs: AnsweredPair[],
  contextInfo: string
): Promise<ScoredAnswer[]> {
  if (!process.env.GROQ_API_KEY || answeredPairs.length === 0) {
    console.warn("⚠️ Groq API not configured or no answers, using fallback scoring");
    return answeredPairs.map(({ question, answer }) => ({
      answerId: answer.id,
      questionId: question.id,
      questionText: question.questionText,
      answer: answer.candidateAnswer,
      submittedAt: answer.submittedAt,
      ...getFallbackScore(answer.candidateAnswer),
    }));
  }

  const questionsBlock = answeredPairs
    .map(({ question, answer }, i) =>
      `Q${i + 1}: ${question.questionText}\nA${i + 1}: ${answer.candidateAnswer}`
    )
    .join("\n\n");

  const prompt = `You are an expert interviewer. Evaluate each answer below and return a JSON array.

CONTEXT:
${contextInfo}

ANSWERS TO EVALUATE:
${questionsBlock}

Return a JSON array with exactly ${answeredPairs.length} objects in the same order:
[
  {
    "score": <1-10>,
    "feedback": "<detailed feedback>",
    "strengths": "<what was done well>",
    "improvements": "<specific areas to improve>"
  }
]

SCORING: 1-2 irrelevant/nonsensical, 3-4 poor, 5-6 below average, 7-8 good, 9-10 excellent.
Only return the JSON array, no extra text.`;

  try {
    const text = await generateCompletion(prompt);
    const evaluations = extractJSONArray<AnswerScore>(text);

    return answeredPairs.map(({ question, answer }, i) => {
      const ev = evaluations[i] || {};
      return {
        answerId: answer.id,
        questionId: question.id,
        questionText: question.questionText,
        answer: answer.candidateAnswer,
        submittedAt: answer.submittedAt,
        score: Math.max(1, Math.min(10, ev.score || 5)),
        feedback: ev.feedback || "No feedback provided.",
        strengths: ev.strengths || "No strengths identified.",
        improvements: ev.improvements || "No improvements suggested.",
      };
    });
  } catch (error) {
    console.error("❌ Batch scoring failed:", (error as Error)?.message || error);
    return answeredPairs.map(({ question, answer }) => ({
      answerId: answer.id,
      questionId: question.id,
      questionText: question.questionText,
      answer: answer.candidateAnswer,
      submittedAt: answer.submittedAt,
      ...getFallbackScore(answer.candidateAnswer),
    }));
  }
}
