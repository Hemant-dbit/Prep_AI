import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Groq from "groq-sdk";

const prisma = new PrismaClient();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const JWT_SECRET = process.env.JWT_SECRET;

// Temporary storage reference (shared with answer route)
const temporaryScores = new Map();
const temporaryAnswers = new Map();

export async function POST(request) {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (jsonError) {
      console.error("❌ JSON parsing error in request body:", jsonError);
      return NextResponse.json(
        { error: "Invalid request body format" },
        { status: 400 }
      );
    }

    const { sessionId } = requestBody;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.userId;

    let finalResults;
    let usedFallback = false;

    try {
      // Get session with all answers and questions from database
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
          answers: {
            include: {
              question: true,
            },
          },
          questions: {
            orderBy: { order: "asc" },
          },
          jd: true,
        },
      });

      if (!session || session.userId !== userId) {
        return NextResponse.json(
          { error: "Session not found or unauthorized" },
          { status: 404 }
        );
      }

      const totalQuestions = session.questions.length;
      const answeredQuestions = session.answers.length;

      // Calculate individual question scores using AI (batched single call)
      // Only call Groq if there are answered questions and session wasn't terminated
      const answeredPairs = session.questions
        .map((q) => ({ question: q, answer: session.answers.find((a) => a.questionId === q.id) }))
        .filter(({ answer }) => !!answer);

      let questionResults;
      if (answeredPairs.length === 0 || session.status === "TERMINATED") {
        // No answers or terminated — skip AI call, use fallback scores
        questionResults = answeredPairs.map(({ question, answer }) => ({
          answerId: answer.id,
          questionId: question.id,
          questionText: question.questionText,
          answer: answer.candidateAnswer,
          submittedAt: answer.submittedAt,
          ...getFallbackScore(answer.candidateAnswer),
        }));
      } else {
        questionResults = await batchScoreAnswers(answeredPairs, session);
      }

      // Store scores back to database
      await Promise.all(
        questionResults.map(({ answerId, score, feedback, strengths, improvements }) =>
          prisma.answer.update({
            where: { id: answerId },
            data: { score, feedback, strengths, improvements },
          })
        )
      );

      // Calculate overall score
      const totalScore = questionResults.reduce((sum, result) => sum + result.score, 0);
      const averageScore = questionResults.length > 0 ? totalScore / questionResults.length : 0;
      const completionPercentage = (answeredQuestions / totalQuestions) * 100;

      // Update session as completed
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          score: averageScore,
          endedAt: new Date(),
          feedback: generateOverallFeedback(averageScore, completionPercentage),
        },
      });

      finalResults = {
        sessionId,
        totalQuestions,
        answeredQuestions,
        completionPercentage: parseFloat(completionPercentage.toFixed(1)),
        overallScore: parseFloat(averageScore.toFixed(1)),
        grade: getGrade(averageScore),
        questionResults,
        overallFeedback: generateOverallFeedback(
          averageScore,
          completionPercentage
        ),
        jobRole: session.jd?.parsedData?.jobRole || "Software Developer",
        completedAt: new Date().toISOString(),
      };
    } catch (dbError) {
      console.error(
        "❌ Database unavailable, using fallback calculation:",
        dbError
      );

      // Calculate from temporary storage
      const sessionAnswers = Array.from(temporaryAnswers.keys())
        .filter((key) => key.startsWith(sessionId))
        .map((key) => temporaryAnswers.get(key));

      const sessionScores = Array.from(temporaryScores.keys())
        .filter((key) => key.startsWith(sessionId))
        .map((key) => temporaryScores.get(key));

      if (sessionAnswers.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "No answers found for this session",
          },
          { status: 400 }
        );
      }

      const totalQuestions = 10;
      const answeredQuestions = sessionAnswers.length;
      const completionPercentage = (answeredQuestions / totalQuestions) * 100;

      // Generate mock results for fallback
      const questionResults = sessionAnswers.map((answer, index) => {
        const score =
          sessionScores.find((s) => s.questionId === answer.questionId)
            ?.score || Math.floor(Math.random() * 4) + 6;

        return {
          questionId: answer.questionId,
          questionText: `Interview Question ${index + 1}`,
          answer: answer.candidateAnswer,
          score: score,
          feedback: `Answer recorded with score ${score}/10 (temporary storage)`,
          submittedAt: answer.submittedAt,
        };
      });

      const totalScore = questionResults.reduce(
        (sum, result) => sum + result.score,
        0
      );
      const averageScore = totalScore / questionResults.length;

      finalResults = {
        sessionId,
        totalQuestions,
        answeredQuestions,
        completionPercentage: parseFloat(completionPercentage.toFixed(1)),
        overallScore: parseFloat(averageScore.toFixed(1)),
        grade: getGrade(averageScore),
        questionResults,
        overallFeedback:
          generateOverallFeedback(averageScore, completionPercentage) +
          " (Demo mode - results not saved)",
        jobRole: "Software Developer",
        completedAt: new Date().toISOString(),
        fallbackMode: true,
      };

      usedFallback = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...finalResults,
        fallbackMode: usedFallback,
      },
    });
  } catch (error) {
    console.error("❌ Error finishing interview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getGrade(score) {
  if (score >= 9) return "Excellent";
  if (score >= 8) return "Good";
  if (score >= 7) return "Average";
  if (score >= 6) return "Below Average";
  return "Needs Improvement";
}

function generateOverallFeedback(score, completion) {
  const grade = getGrade(score);
  let feedback = `You completed ${completion.toFixed(
    0
  )}% of the interview with an overall score of ${score.toFixed(
    1
  )}/10 (${grade}). `;

  if (score >= 8) {
    feedback +=
      "Excellent performance! You demonstrated strong knowledge and communication skills.";
  } else if (score >= 7) {
    feedback +=
      "Good job! You showed solid understanding with room for some improvement.";
  } else if (score >= 6) {
    feedback +=
      "Decent performance. Focus on providing more detailed and specific answers.";
  } else {
    feedback +=
      "There's room for improvement. Practice more and focus on giving comprehensive answers.";
  }

  return feedback;
}

function getFallbackScore(answer) {
  const answerLength = answer.trim().length;
  const wordCount = answer.trim().split(/\s+/).length;

  let score = 1;
  let feedback = "System evaluation based on response characteristics.";
  let strengths = "Response was submitted successfully.";
  let improvements = "Focus on providing detailed, relevant answers.";

  // Basic scoring logic based on length and word count
  if (answerLength < 10) {
    score = 1;
    feedback = "Very brief response. Consider providing more detail.";
    improvements =
      "Expand your answer with specific examples and explanations.";
  } else if (answerLength < 50 || wordCount < 10) {
    score = 3;
    feedback = "Short response with limited detail.";
    improvements = "Add more specific examples and elaborate on key points.";
  } else if (answerLength < 150 || wordCount < 25) {
    score = 5;
    feedback = "Moderate response length with basic coverage.";
    strengths = "Provided a reasonable amount of detail.";
    improvements =
      "Consider adding specific examples and more comprehensive explanations.";
  } else if (answerLength < 300 || wordCount < 50) {
    score = 7;
    feedback = "Well-developed response with good detail.";
    strengths = "Comprehensive answer with good structure.";
    improvements = "Continue providing detailed, well-structured responses.";
  } else {
    score = 8;
    feedback = "Detailed and comprehensive response.";
    strengths = "Thorough and well-elaborated answer.";
    improvements = "Maintain this level of detail and specificity.";
  }

  return {
    score,
    feedback,
    strengths,
    improvements,
  };
}

async function batchScoreAnswers(answeredPairs, session) {
  // Build context once
  let contextInfo = "";
  if (session.jd?.parsedData) {
    contextInfo += `Job Role: ${session.jd.parsedData.jobRole || "N/A"}\n`;
    contextInfo += `Experience Level: ${session.jd.parsedData.experienceLevel || "N/A"} years\n`;
    contextInfo += `Required Skills: ${session.jd.parsedData.skills?.join(", ") || "N/A"}\n`;
  }
  if (session.resume?.parsedData) {
    const r = session.resume.parsedData;
    contextInfo += `Candidate Skills: ${Array.isArray(r.skills) ? r.skills.join(", ") : "N/A"}\n`;
    contextInfo += `Candidate Experience: ${
      Array.isArray(r.experience) ? r.experience.map((e) => `${e.position} at ${e.company}`).join("; ") : "N/A"
    }\n`;
  }

  // Use fallback if no API key
  if (!process.env.GROQ_API_KEY) {
    console.warn("⚠️ Groq API not configured, using fallback scoring");
    return answeredPairs.map(({ question, answer }) => ({
      answerId: answer.id,
      questionId: question.id,
      questionText: question.questionText,
      answer: answer.candidateAnswer,
      submittedAt: answer.submittedAt,
      ...getFallbackScore(answer.candidateAnswer),
    }));
  }

  // Build batched prompt
  const questionsBlock = answeredPairs
    .map(
      ({ question, answer }, i) =>
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
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });
    const text = completion.choices[0].message.content;
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
    const jsonStart = cleanedText.indexOf("[");
    const jsonEnd = cleanedText.lastIndexOf("]");
    const evaluations = JSON.parse(cleanedText.slice(jsonStart, jsonEnd + 1));

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
    console.error("❌ Batch scoring failed:", error?.message || error);
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
