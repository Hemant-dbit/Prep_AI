import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function POST(request) {
  const { decoded, error: authError } = verifyAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { jobRole, jobDescription, experienceYears, resumeFileName, existingResumeId } = body;

  if (!jobRole || !jobDescription || experienceYears === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: jobRole, jobDescription, experienceYears" },
      { status: 400 }
    );
  }

  const expYears = parseInt(experienceYears);
  if (isNaN(expYears) || expYears < 0) {
    return NextResponse.json(
      { error: "Experience years must be a valid non-negative number" },
      { status: 400 }
    );
  }

  try {
    // Resolve resume
    let resumeId;
    if (existingResumeId) {
      const existing = await prisma.resume.findFirst({
        where: { id: existingResumeId, userId: decoded.userId },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Resume not found or unauthorized" }, { status: 404 });
      }
      resumeId = existingResumeId;
    } else {
      const resume = await prisma.resume.create({
        data: {
          userId: decoded.userId,
          file_name: resumeFileName || "No resume uploaded",
          file_path: null,
          parsedData: {
            name: "",
            skills: [],
            experience: [],
            education: [],
            summary: "Please upload your resume for better question generation",
          },
        },
      });
      resumeId = resume.id;
    }

    // Create JD record
    const jdRecord = await prisma.jD.create({
      data: {
        userId: decoded.userId,
        parsedData: {
          title: jobRole,
          jobRole,
          skillsReq: jobDescription.split(",").map((s) => s.trim()),
          expReq: expYears,
          experienceLevel: expYears,
        },
      },
    });

    // Create interview session
    const session = await prisma.interviewSession.create({
      data: {
        userId: decoded.userId,
        resumeId,
        jdId: jdRecord.id,
        status: "ACTIVE",
        score: 0,
        feedback: "",
        startedAt: new Date(),
      },
    });

    // Trigger question generation (non-blocking on failure)
    console.log("🧩 Generating questions with data:", {
      sessionId: session.id,
      jobRole,
      jobDescription,
      experienceLevel: expYears,
    });

    try {
      const token = request.headers.get("authorization")?.substring(7);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/interview/generate-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: session.id,
          jobDescription,
          experienceLevel: expYears,
          jobRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to generate questions:", data);
      } else {
        console.log("✅ Questions generated successfully:", data?.questions?.length || 0);
      }
    } catch (err) {
      console.error("Error generating questions:", err);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Interview session created successfully",
        data: {
          sessionId: session.id,
          jdId: jdRecord.id,
          resumeId,
          jobRole,
          experienceYears: expYears,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
