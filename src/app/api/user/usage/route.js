import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

const FREE_LIMITS = { interviews: 4, resumes: 6 };
const PRO_LIMITS = { interviews: 40, resumes: 20 };

export async function GET(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isPremium: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [interviewCount, resumeCount] = await Promise.all([
      prisma.interviewSession.count({ where: { userId: decoded.userId } }),
      prisma.resume.count({ where: { userId: decoded.userId } }),
    ]);

    const limits = user.isPremium ? PRO_LIMITS : FREE_LIMITS;

    return NextResponse.json({
      usage: {
        interviews: {
          used: interviewCount,
          limit: limits.interviews,
          percentage: Math.round((interviewCount / limits.interviews) * 100),
        },
        resumes: {
          used: resumeCount,
          limit: limits.resumes,
          percentage: Math.round((resumeCount / limits.resumes) * 100),
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch usage statistics" }, { status: 500 });
  }
}
