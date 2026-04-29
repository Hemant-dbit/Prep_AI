import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";
import { batchScoreAnswers, getFallbackScore } from "@/server/services/groq.service";

function getGrade(score) {
  if (score >= 9) return "Excellent";
  if (score >= 8) return "Good";
  if (score >= 7) return "Average";
  if (score >= 6) return "Below Average";
  return "Needs Improvement";
}

function generateOverallFeedback(score, completion) {
  const grade = getGrade(score);
  let feedback = `You completed ${completion.toFixed(0)}% of the interview with an overall score of ${score.toFixed(1)}/10 (${grade}). `;
  if (score >= 8) feedback += "Excellent performance! You demonstrated strong knowledge and communication skills.";
  else if (score >= 7) feedback += "Good job! You showed solid understanding with room for some improvement.";
  else if (score >= 6) feedback += "Decent performance. Focus on providing more detailed and specific answers.";
  else feedback += "There's room for improvement. Practice more and focus on giving comprehensive answers.";
  return feedback;
}

function buildContextInfo(session) {
  let ctx = "";
  if (session.jd?.parsedData) {
    ctx += `Job Role: ${session.jd.parsedData.jobRole || "N/A"}\n`;
    ctx += `Experience Level: ${session.jd.parsedData.experienceLevel || "N/A"} years\n`;
    ctx += `Required Skills: ${session.jd.parsedData.skills?.join(", ") || "N/A"}\n`;
  }
  if (session.resume?.parsedData) {
    const r = session.resume.parsedData;
    ctx += `Candidate Skills: ${Array.isArray(r.skills) ? r.skills.join(", ") : "N/A"}\n`;
    ctx += `Candidate Experience: ${
      Array.isArray(r.experience)
        ? r.experience.map((e) => `${e.position} at ${e.company}`).join("; ")
        : "N/A"
    }\n`;
  }
  return ctx;
}

export async function POST(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body format" }, { status: 400 });
  }

  const { sessionId } = requestBody;
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: { include: { question: true } },
        questions: { orderBy: { order: "asc" } },
        jd: true,
        resume: true,
      },
    });

    if (!session || session.userId !== decoded.userId) {
      return NextResponse.json({ error: "Session not found or unauthorized" }, { status: 404 });
    }

    const totalQuestions = session.questions.length;
    const answeredQuestions = session.answers.length;

    // Only score answered questions; skip AI if terminated or no answers
    const answeredPairs = session.questions
      .map((q) => ({ question: q, answer: session.answers.find((a) => a.questionId === q.id) }))
      .filter(({ answer }) => !!answer);

    let questionResults;
    if (answeredPairs.length === 0 || session.status === "TERMINATED") {
      questionResults = answeredPairs.map(({ question, answer }) => ({
        answerId: answer.id,
        questionId: question.id,
        questionText: question.questionText,
        answer: answer.candidateAnswer,
        submittedAt: answer.submittedAt,
        ...getFallbackScore(answer.candidateAnswer),
      }));
    } else {
      questionResults = await batchScoreAnswers(answeredPairs, buildContextInfo(session));
    }

    // Persist scores
    await Promise.all(
      questionResults.map(({ answerId, score, feedback, strengths, improvements }) =>
        prisma.answer.update({
          where: { id: answerId },
          data: { score, feedback, strengths, improvements },
        })
      )
    );

    const totalScore = questionResults.reduce((sum, r) => sum + r.score, 0);
    const averageScore = questionResults.length > 0 ? totalScore / questionResults.length : 0;
    const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        score: averageScore,
        endedAt: new Date(),
        feedback: generateOverallFeedback(averageScore, completionPercentage),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        totalQuestions,
        answeredQuestions,
        completionPercentage: parseFloat(completionPercentage.toFixed(1)),
        overallScore: parseFloat(averageScore.toFixed(1)),
        grade: getGrade(averageScore),
        questionResults,
        overallFeedback: generateOverallFeedback(averageScore, completionPercentage),
        jobRole: session.jd?.parsedData?.jobRole || "Software Developer",
        completedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("❌ Error finishing interview:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
