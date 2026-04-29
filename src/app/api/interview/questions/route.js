import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function GET(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
  }

  try {
    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: decoded.userId },
      include: {
        questions: { orderBy: { order: "asc" } },
        jd: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Interview session not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      },
      questions: session.questions,
      jobDescription: session.jd,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
