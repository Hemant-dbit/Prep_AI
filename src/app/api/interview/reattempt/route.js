import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function POST(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { originalSessionId } = await request.json();

  if (!originalSessionId) {
    return NextResponse.json({ error: "Missing required field: originalSessionId" }, { status: 400 });
  }

  try {
    const originalSession = await prisma.interviewSession.findFirst({
      where: { id: originalSessionId, userId: decoded.userId },
      include: {
        jd: true,
        resume: true,
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!originalSession) {
      return NextResponse.json(
        { error: "Original interview session not found or unauthorized" },
        { status: 404 }
      );
    }

    if (!originalSession.questions || originalSession.questions.length === 0) {
      return NextResponse.json(
        { error: "Original interview session has no questions to re-attempt" },
        { status: 400 }
      );
    }

    const newSession = await prisma.interviewSession.create({
      data: {
        userId: decoded.userId,
        resumeId: originalSession.resumeId,
        jdId: originalSession.jdId,
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });

    await prisma.question.createMany({
      data: originalSession.questions.map((q) => ({
        sessionId: newSession.id,
        questionText: q.questionText,
        order: q.order,
      })),
    });

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { interviewAttempts: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
      message: "Interview re-attempted successfully with original questions",
      questionsCount: originalSession.questions.length,
    });
  } catch {
    return NextResponse.json({ error: "Failed to re-attempt interview" }, { status: 500 });
  }
}
