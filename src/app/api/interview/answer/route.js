import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function POST(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { sessionId, questionId, answer } = await request.json();

  if (!sessionId || !questionId || !answer) {
    return NextResponse.json(
      { error: "Session ID, Question ID, and answer are required" },
      { status: 400 }
    );
  }

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session || session.userId !== decoded.userId) {
      return NextResponse.json(
        { error: "Session not found or unauthorized" },
        { status: 404 }
      );
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { sessionId: true },
    });

    if (!question || question.sessionId !== sessionId) {
      return NextResponse.json(
        { error: "Question not found in this session" },
        { status: 404 }
      );
    }

    // Upsert answer — check for existing first since no unique constraint
    const existingAnswer = await prisma.answer.findFirst({
      where: { sessionId, questionId },
    });

    const savedAnswer = existingAnswer
      ? await prisma.answer.update({
          where: { id: existingAnswer.id },
          data: { candidateAnswer: answer, submittedAt: new Date() },
        })
      : await prisma.answer.create({
          data: { sessionId, questionId, candidateAnswer: answer },
        });

    return NextResponse.json({
      success: true,
      message: "Answer saved successfully",
      data: {
        answerId: savedAnswer.id,
        submittedAt: savedAnswer.submittedAt,
      },
    });
  } catch (err) {
    console.error("❌ Error saving answer:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
