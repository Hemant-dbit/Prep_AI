import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { verifyAuth } from "@/server/lib/auth";

export async function GET(request, { params }) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { interviewId } = await params;

  if (!interviewId) {
    return NextResponse.json({ error: "Interview ID is required" }, { status: 400 });
  }

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: interviewId },
      include: {
        jd: true,
        resume: true,
        questions: {
          include: {
            answers: {
              orderBy: { submittedAt: "desc" },
              take: 1,
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
    }

    if (session.userId !== decoded.userId) {
      return NextResponse.json({ error: "Unauthorized access to this interview session" }, { status: 403 });
    }

    const questionResults = session.questions.map((q) => {
      const answer = q.answers[0];
      return {
        questionId: q.id,
        questionText: q.questionText,
        order: q.order,
        answer: answer?.candidateAnswer ?? null,
        score: answer?.score ?? null,
        feedback: answer?.feedback ?? null,
        strengths: answer?.strengths ?? null,
        improvements: answer?.improvements ?? null,
        submittedAt: answer?.submittedAt ?? null,
      };
    });

    const answersWithScores = questionResults.filter((q) => q.score !== null);
    const overallScore =
      answersWithScores.length > 0
        ? answersWithScores.reduce((sum, q) => sum + q.score, 0) / answersWithScores.length
        : 0;

    const totalQuestions = session.questions.length;
    const answeredQuestions = questionResults.filter((q) => q.answer !== null).length;
    const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    let grade = "Not Graded";
    if (overallScore >= 9) grade = "Excellent";
    else if (overallScore >= 8) grade = "Very Good";
    else if (overallScore >= 7) grade = "Good";
    else if (overallScore >= 6) grade = "Average";
    else if (overallScore >= 5) grade = "Below Average";
    else if (overallScore > 0) grade = "Needs Improvement";

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        jobRole: session.jd?.parsedData?.title || session.jd?.parsedData?.jobRole || "Unknown Position",
        experienceLevel: session.jd?.parsedData?.expReq || session.jd?.parsedData?.experienceLevel || "0",
        createdAt: session.startedAt,
        updatedAt: session.updatedAt,
        status: session.status,
        overallScore: parseFloat(overallScore.toFixed(1)),
        grade,
        totalQuestions,
        answeredQuestions,
        completionPercentage,
        questionResults,
        jobDescription: session.jd?.parsedData || null,
        candidateInfo: session.resume?.parsedData || null,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching interview details:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
