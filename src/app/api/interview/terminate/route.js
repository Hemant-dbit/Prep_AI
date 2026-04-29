import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function POST(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const body = await request.json();
  const { sessionId, reason, warningCount } = body;

  if (!sessionId || !reason) {
    return NextResponse.json(
      { error: "Missing required fields: sessionId, reason" },
      { status: 400 }
    );
  }

  try {
    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: decoded.userId },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Interview session not found or unauthorized" },
        { status: 404 }
      );
    }

    const updated = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "TERMINATED",
        endedAt: new Date(),
        feedback: `Interview terminated: ${reason}. Warning count: ${warningCount || 0}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Interview session terminated successfully",
      sessionId: updated.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to terminate interview session" },
      { status: 500 }
    );
  }
}
