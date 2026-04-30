import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function GET(request, { params }) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { id } = await params;

  try {
    const resume = await prisma.resume.findFirst({
      where: { id, userId: decoded.userId },
      select: { id: true, file_name: true, parsedData: true, createdAt: true, updatedAt: true },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        fileName: resume.file_name,
        uploadedAt: resume.createdAt.toISOString(),
        parsedData: resume.parsedData || {
          name: "", email: "", phone: "", skills: [],
          experience: [], projects: [], education: [],
          summary: "No parsed data available",
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch resume details" }, { status: 500 });
  }
}
