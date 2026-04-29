import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";
import { generateCompletion, extractJSON } from "@/server/services/groq.service";

// Builds resume context string from parsed resume data
function buildResumeInfo(parsedData) {
  if (!parsedData) return "Resume Information: No resume data available";
  return `
Resume Information:
- Name: ${parsedData.name || "N/A"}
- Skills: ${Array.isArray(parsedData.skills) ? parsedData.skills.join(", ") : "N/A"}
- Experience: ${
    Array.isArray(parsedData.experience)
      ? parsedData.experience.map((e) => `${e.position} at ${e.company} (${e.duration})`).join("; ")
      : "N/A"
  }
- Projects: ${
    Array.isArray(parsedData.projects)
      ? parsedData.projects
          .map((p) => `${p.name || p.title}: ${p.description || ""} (Technologies: ${Array.isArray(p.technologies) ? p.technologies.join(", ") : p.tech || "N/A"})`)
          .join("; ")
      : "N/A"
  }
- Education: ${
    Array.isArray(parsedData.education)
      ? parsedData.education.map((e) => `${e.degree} in ${e.field} from ${e.institution}`).join("; ")
      : "N/A"
  }
- Summary: ${parsedData.summary || "N/A"}`;
}

// Role and experience-aware fallback questions when AI is unavailable
function buildFallbackQuestions(jobRole, experienceLevel) {
  const role = jobRole.toLowerCase();
  const level = parseInt(experienceLevel);
  const questions = [];

  // Role-specific technical questions
  if (role.includes("frontend") || role.includes("react") || role.includes("ui")) {
    questions.push(
      { text: `How would you optimize a React application's performance for a ${jobRole} role?`, type: "technical", difficulty: "medium", focus_area: "Performance Optimization" },
      { text: "Describe your approach to responsive design and cross-browser compatibility.", type: "technical", difficulty: "medium", focus_area: "Frontend Development" }
    );
  } else if (role.includes("backend") || role.includes("api") || role.includes("server")) {
    questions.push(
      { text: `How would you design a scalable API for a ${jobRole} position?`, type: "technical", difficulty: "medium", focus_area: "Backend Architecture" },
      { text: "Explain your approach to database optimization and query performance.", type: "technical", difficulty: "medium", focus_area: "Database Management" }
    );
  } else if (role.includes("fullstack") || role.includes("full-stack")) {
    questions.push(
      { text: `As a ${jobRole}, how do you balance frontend and backend development priorities?`, type: "technical", difficulty: "medium", focus_area: "Full-Stack Development" },
      { text: "Describe your approach to building end-to-end features from UI to database.", type: "technical", difficulty: "medium", focus_area: "Full-Stack Architecture" }
    );
  } else {
    questions.push(
      { text: `What technical challenges do you expect in a ${jobRole} role?`, type: "technical", difficulty: "medium", focus_area: "Technical Problem Solving" },
      { text: "Describe your approach to learning new technologies required for this position.", type: "technical", difficulty: "medium", focus_area: "Technical Learning" }
    );
  }

  // Experience-level behavioral questions
  if (level <= 2) {
    questions.push(
      { text: "Tell me about your professional background and what interests you about this role.", type: "behavioral", difficulty: "easy", focus_area: "Background & Motivation" },
      { text: "Describe a challenging problem you solved during your studies or early career.", type: "behavioral", difficulty: "easy", focus_area: "Problem Solving" },
      { text: "How do you approach learning new technologies or frameworks?", type: "behavioral", difficulty: "easy", focus_area: "Learning & Growth" }
    );
  } else if (level <= 5) {
    questions.push(
      { text: "Describe a time when you had to make important technical decisions on a project.", type: "behavioral", difficulty: "medium", focus_area: "Technical Leadership" },
      { text: "How do you handle conflicting priorities and tight deadlines?", type: "behavioral", difficulty: "medium", focus_area: "Time Management" },
      { text: "Tell me about a time you mentored or helped a junior team member.", type: "behavioral", difficulty: "medium", focus_area: "Mentoring & Collaboration" }
    );
  } else {
    questions.push(
      { text: "How do you approach system architecture decisions for large-scale applications?", type: "technical", difficulty: "hard", focus_area: "System Architecture" },
      { text: "Describe your experience leading technical teams and driving engineering culture.", type: "behavioral", difficulty: "hard", focus_area: "Technical Leadership" },
      { text: "How do you balance technical debt with feature development in your projects?", type: "behavioral", difficulty: "hard", focus_area: "Strategic Planning" }
    );
  }

  // Fill remaining slots with generic questions
  questions.push(
    { text: "What motivates you in your work as a software engineer?", type: "behavioral", difficulty: "easy", focus_area: "Motivation & Values" },
    { text: "Describe a project you're particularly proud of and your role in its success.", type: "behavioral", difficulty: "medium", focus_area: "Project Success" },
    { text: "How do you stay updated with industry trends and best practices?", type: "behavioral", difficulty: "easy", focus_area: "Professional Development" }
  );

  return questions.slice(0, 10);
}

async function saveAndReturnQuestions(sessionId, questions) {
  await prisma.question.createMany({
    data: questions.map((q, i) => ({
      sessionId,
      questionText: q.text,
      order: i + 1,
    })),
  });
  return prisma.question.findMany({
    where: { sessionId },
    orderBy: { order: "asc" },
  });
}

export async function POST(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const body = await request.json();
  const { sessionId, jobDescription, experienceLevel, jobRole } = body;

  if (!sessionId || !jobDescription || experienceLevel == null || !jobRole) {
    return NextResponse.json(
      { error: "Missing required fields: sessionId, jobDescription, experienceLevel, jobRole" },
      { status: 400 }
    );
  }

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: decoded.userId },
    include: { resume: true, jd: true },
  });

  if (!session) {
    return NextResponse.json(
      { error: "Interview session not found or unauthorized" },
      { status: 404 }
    );
  }

  // Return existing questions if already generated
  const existing = await prisma.question.findMany({
    where: { sessionId },
    orderBy: { order: "asc" },
  });
  if (existing.length > 0) {
    return NextResponse.json({ success: true, message: "Questions already exist for this session", questions: existing });
  }

  // Build prompt and generate questions
  const resumeInfo = buildResumeInfo(session.resume?.parsedData);
  const prompt = `
You are an expert technical interviewer conducting a ${jobRole} interview for a candidate with ${experienceLevel} years of experience.

ANALYZE THE FOLLOWING INFORMATION CAREFULLY:

=== JOB DESCRIPTION ===
${jobDescription}

=== CANDIDATE'S RESUME ===
${resumeInfo}

TASK: Generate exactly 10 highly personalized and relevant interview questions.

RULES:
- Technical questions (7/10): Reference specific projects, technologies, and decisions from the resume
- Behavioral questions (3/10): Reference specific experiences and transitions from the resume
- Scale difficulty: 0-2 yrs = fundamentals, 3-5 yrs = architecture/collaboration, 5+ yrs = system design/leadership
- Every question must feel crafted specifically for this candidate and role

Return exactly this JSON format:
{
  "questions": [
    {
      "text": "question text",
      "type": "technical|behavioral",
      "difficulty": "easy|medium|hard",
      "focus_area": "specific area"
    }
  ]
}

Only return the JSON object, no additional text.`;

  try {
    const text = await generateCompletion(prompt);
    let questionsData;
    try {
      questionsData = extractJSON(text);
    } catch {
      console.error("Error parsing AI response, using fallback questions");
      questionsData = { questions: buildFallbackQuestions(jobRole, experienceLevel) };
    }

    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      questionsData = { questions: buildFallbackQuestions(jobRole, experienceLevel) };
    }

    const savedQuestions = await saveAndReturnQuestions(sessionId, questionsData.questions);

    return NextResponse.json({
      success: true,
      message: "Questions generated and saved successfully",
      questions: savedQuestions,
      questionsCreated: savedQuestions.length,
    });
  } catch (err) {
    console.error("Error with Groq AI:", err);
    const fallback = buildFallbackQuestions(jobRole, experienceLevel);
    const savedQuestions = await saveAndReturnQuestions(sessionId, fallback);
    return NextResponse.json({
      success: true,
      message: "Fallback questions created successfully (AI service unavailable)",
      questions: savedQuestions,
    });
  }
}
