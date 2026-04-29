import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function GET(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  try {
    if (sessionId) {
      const session = await prisma.interviewSession.findFirst({
        where: { id: sessionId, userId: decoded.userId },
        include: { resume: true, questions: true, jd: true },
      });

      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, session });
    }

    const sessions = await prisma.interviewSession.findMany({
      where: { userId: decoded.userId },
      include: { resume: true, questions: true, jd: true },
      orderBy: { startedAt: "desc" },
    });

    const formatted = sessions.map((s) => ({
      sessionId: s.id,
      status: s.status,
      score: s.score,
      feedback: s.feedback,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      jobRole: s.job_role,
      jobDescription: s.job_description,
      experienceYears: s.experience_years,
      resume: s.resume
        ? { id: s.resume.id, fileName: s.resume.file_name, parsedData: s.resume.parsedData }
        : null,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
