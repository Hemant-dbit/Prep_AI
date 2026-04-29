import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";
import { extractTextFromPDF } from "@/server/services/pdf.service";
import { generateCompletion, extractJSON } from "@/server/services/groq.service";

// Builds the analysis prompt — same structure for both text and PDF inputs
function buildAnalysisPrompt(resumeText, jobDescription) {
  const jdSection = jobDescription
    ? `JOB DESCRIPTION (for targeted analysis):\n${jobDescription}\n\nFocus on how well the resume matches the provided job description, including relevant skills, experience, and keywords.`
    : `Provide general resume improvement advice focusing on content quality and professional presentation.`;

  return `You are an expert resume reviewer and career advisor. Analyze the following resume and provide a comprehensive evaluation.

RESUME TEXT:
${resumeText}

${jdSection}

Return a JSON object in this exact format:
{
  "overallScore": <number 0-100>,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "detailedAnalysis": {
    "formatting": <number 0-100>,
    "content": <number 0-100>,
    "skills": <number 0-100>,
    "experience": <number 0-100>,
    "keywords": <number 0-100>
  }
}

Provide specific, actionable feedback. Only return the JSON object.`;
}

// Clamps all scores to 0-100 range
function clampScores(analysis) {
  analysis.overallScore = Math.max(0, Math.min(100, analysis.overallScore));
  Object.keys(analysis.detailedAnalysis).forEach((key) => {
    analysis.detailedAnalysis[key] = Math.max(0, Math.min(100, analysis.detailedAnalysis[key]));
  });
  return analysis;
}

export async function POST(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  try {
    const formData = await request.formData();
    const resumeFile = formData.get("resume");
    const jobDescription = formData.get("jobDescription");

    if (!resumeFile) {
      return NextResponse.json(
        { error: "Resume file is required" },
        { status: 400 }
      );
    }

    // Resolve resume text — either from plain text input or PDF extraction
    let resumeText;
    let fileName;
    let analysisType;

    if (resumeFile.name === "resume.txt") {
      resumeText = await resumeFile.text();
      fileName = "text_resume_analysis.txt";
      analysisType = "TEXT";

      if (!resumeText.trim()) {
        return NextResponse.json(
          { error: "Resume text cannot be empty" },
          { status: 400 }
        );
      }
    } else {
      if (resumeFile.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Only PDF files are supported" },
          { status: 400 }
        );
      }
      if (resumeFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size must be less than 10MB" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      resumeText = await extractTextFromPDF(buffer);
      fileName = resumeFile.name || "analyzed_resume.pdf";
      analysisType = "PDF";

      if (!resumeText.trim()) {
        return NextResponse.json(
          { error: "No text could be extracted from the PDF. Please ensure your resume contains readable text." },
          { status: 400 }
        );
      }
    }

    // Run AI analysis
    const prompt = buildAnalysisPrompt(resumeText, jobDescription);
    let analysis;
    try {
      const responseText = await generateCompletion(prompt);
      analysis = clampScores(extractJSON(responseText));
    } catch {
      return NextResponse.json(
        { error: "AI analysis service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // Persist analysis (non-blocking — don't fail the request if DB write fails)
    prisma.resumeAnalysis.create({
      data: {
        userId: decoded.userId,
        fileName,
        analysisType,
        overallScore: analysis.overallScore,
        detailedScores: analysis.detailedAnalysis,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        suggestions: analysis.suggestions,
        extractedText: resumeText.substring(0, 2000),
        jobDescription: jobDescription || null,
      },
    }).catch((err) => console.error("DB storage error (non-fatal):", err));

    return NextResponse.json({
      success: true,
      analysis,
      message: `${analysisType === "TEXT" ? "Text" : "PDF"} Resume analyzed successfully`,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
