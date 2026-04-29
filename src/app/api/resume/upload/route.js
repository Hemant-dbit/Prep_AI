import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";
import { extractTextFromPDF } from "@/server/services/pdf.service";
import { parseResumeWithAI } from "@/server/services/groq.service";

export async function POST(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const userId = decoded.userId;

  // Ensure user exists, create if not (handles OAuth edge cases)
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: decoded.email || `user-${userId}@temp.com`,
          passwordHash: "temp-hash",
          name: decoded.name || "User",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "User account issue - please login again" },
        { status: 401 }
      );
    }
  }

  const formData = await request.formData();
  const file = formData.get("resume");
  const fileName = formData.get("fileName") || "resume.pdf";

  if (!file) {
    return NextResponse.json(
      { error: "No resume file provided" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const extractedText = await extractTextFromPDF(buffer);

  const parsedData = await parseResumeWithAI(extractedText);

  try {
    const resume = await prisma.resume.create({
      data: {
        userId,
        file_name: fileName,
        file_path: null,
        parsedData: {
          ...parsedData,
          fileName,
          fileSize: buffer.length,
          uploadedAt: new Date().toISOString(),
          extractedText: extractedText.substring(0, 1000),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Resume "${fileName}" uploaded and parsed successfully! Extracted ${parsedData.skills?.length || 0} skills, ${parsedData.projects?.length || 0} projects, ${parsedData.experience?.length || 0} work experiences, and ${parsedData.education?.length || 0} education entries.`,
      resume: {
        id: resume.id,
        fileName: resume.file_name,
        parsedData,
        createdAt: resume.createdAt,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save resume to database" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        file_name: true,
        parsedData: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, resumes });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
