import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth/helpers.js";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.userId;
    const interviewId = params.interviewId;

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    // Fetch the interview session with complete details
    const interviewSession = await prisma.interviewSession.findUnique({
      where: {
        id: interviewId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        jd: true,
        resume: true,
        questions: {
          include: {
            answers: {
              orderBy: { submittedAt: "desc" },
              take: 1,
            },
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!interviewSession) {
      return NextResponse.json(
        { error: "Interview session not found" },
        { status: 404 }
      );
    }

    // Check if the user owns this session
    if (interviewSession.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access to this interview session" },
        { status: 403 }
      );
    }

    // Process the results
    const questionResults = interviewSession.questions.map((question) => {
      const answer = question.answers[0]; // Assuming one answer per question
      return {
        questionId: question.id,
        questionText: question.questionText,
        order: question.order,
        answer: answer ? answer.candidateAnswer : null,
        score: answer ? answer.score : null,
        feedback: answer ? answer.feedback : null,
        strengths: answer ? answer.strengths : null,
        improvements: answer ? answer.improvements : null,
        submittedAt: answer ? answer.submittedAt : null,
      };
    });

    // Calculate overall statistics
    const answersWithScores = questionResults.filter((q) => q.score !== null);
    const overallScore =
      answersWithScores.length > 0
        ? answersWithScores.reduce((sum, q) => sum + q.score, 0) /
          answersWithScores.length
        : 0;

    const totalQuestions = interviewSession.questions.length;
    const answeredQuestions = questionResults.filter(
      (q) => q.answer !== null
    ).length;
    const completionPercentage =
      totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

    // Determine grade
    let grade = "Not Graded";
    if (overallScore >= 9) grade = "Excellent";
    else if (overallScore >= 8) grade = "Very Good";
    else if (overallScore >= 7) grade = "Good";
    else if (overallScore >= 6) grade = "Average";
    else if (overallScore >= 5) grade = "Below Average";
    else if (overallScore > 0) grade = "Needs Improvement";

    const result = {
      sessionId: interviewSession.id,
      jobRole:
        interviewSession.jd?.parsedData?.title ||
        interviewSession.jd?.parsedData?.jobRole ||
        "Unknown Position",
      experienceLevel:
        interviewSession.jd?.parsedData?.expReq ||
        interviewSession.jd?.parsedData?.experienceLevel ||
        "0",
      createdAt: interviewSession.startedAt,
      updatedAt: interviewSession.updatedAt,
      status: interviewSession.status,
      overallScore: parseFloat(overallScore.toFixed(1)),
      grade: grade,
      totalQuestions: totalQuestions,
      answeredQuestions: answeredQuestions,
      completionPercentage: completionPercentage,
      questionResults: questionResults,
      jobDescription: interviewSession.jd?.parsedData || null,
      candidateInfo: interviewSession.resume?.parsedData || null,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error fetching interview details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    // keep Prisma client alive across requests in dev/server mode
  }
}
