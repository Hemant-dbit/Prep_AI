import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function POST(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { sessionId } = await request.json();
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { answers: true, questions: true },
    });

    if (!session || session.userId !== decoded.userId) {
      return NextResponse.json({ error: "Session not found or unauthorized" }, { status: 404 });
    }

    const totalQuestions = session.questions.length;
    const answeredQuestions = session.answers.length;
    const completion = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalQuestions,
        answeredQuestions,
        completion,
        status: answeredQuestions === 0 ? "No answers submitted yet" : `${answeredQuestions} of ${totalQuestions} questions answered`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { answers: true, questions: true },
    });

    if (!session || session.userId !== decoded.userId) {
      return NextResponse.json({ error: "Session not found or unauthorized" }, { status: 404 });
    }

    const totalQuestions = session.questions.length;
    const answeredQuestions = session.answers.length;
    const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        totalQuestions,
        answeredQuestions,
        overallScore: 0,
        completion: parseFloat(completionPercentage.toFixed(1)),
        status: session.status,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
