import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {

        isPremium: true,

      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }


    // Get user's interview sessions count
    const interviewCount = await prisma.interviewSession.count({
      where: { userId: userId },
    });

    // Get user's resume count
    const resumeCount = await prisma.resume.count({
      where: { userId: userId },
    });

    // Define limits (you can make these configurable)
    let limits;
    if (user.isPremium) {
      limits = {
        interviews: 40,
        resumes: 20
      }
    } else {
      limits = {
        interviews: 4,
        resumes: 6,
      };
    }

    // Calculate usage statistics
    const usage = {
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
    };

    return NextResponse.json({ usage });
  } catch (error) {
    console.error("Error fetching usage statistics:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch usage statistics" },
      { status: 500 }
    );
  }
}
