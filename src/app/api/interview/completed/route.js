import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function GET(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  try {
    const completedInterviews = await prisma.interviewSession.findMany({
      where: { userId: decoded.userId, status: "COMPLETED" },
      include: {
        jd: true,
        resume: true,
        questions: { include: { answers: true } },
        _count: { select: { questions: true, answers: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    const processed = completedInterviews.map((s) => {
      const totalQuestions = s._count.questions;
      const totalAnswers = s._count.answers;
      const completionPercentage = totalQuestions > 0 ? Math.round((totalAnswers / totalQuestions) * 100) : 0;

      const answersWithScores = s.questions.flatMap((q) => q.answers).filter((a) => a.score !== null);
      const overallScore = answersWithScores.length > 0
        ? answersWithScores.reduce((sum, a) => sum + (a.score || 0), 0) / answersWithScores.length
        : 0;

      let grade = "Not Graded";
      if (overallScore >= 9) grade = "Excellent";
      else if (overallScore >= 8) grade = "Very Good";
      else if (overallScore >= 7) grade = "Good";
      else if (overallScore >= 6) grade = "Average";
      else if (overallScore >= 5) grade = "Below Average";
      else if (overallScore > 0) grade = "Needs Improvement";

      return {
        id: s.id,
        jobRole: s.jd?.parsedData?.title || s.jd?.parsedData?.jobRole || "Unknown Position",
        experienceLevel: s.jd?.parsedData?.expReq || s.jd?.parsedData?.experienceLevel || "0",
        createdAt: s.endedAt || s.startedAt || s.createdAt,
        updatedAt: s.updatedAt,
        overallScore: parseFloat(overallScore.toFixed(1)),
        grade,
        totalQuestions,
        answeredQuestions: totalAnswers,
        completionPercentage,
        status: s.status,
      };
    });

    return NextResponse.json({
      success: true,
      data: { interviews: processed, totalCompleted: processed.length },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
