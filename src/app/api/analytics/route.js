import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function GET(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  try {
    const [interviewSessions, resumeAnalyses] = await Promise.all([
      prisma.interviewSession.findMany({
        where: { userId: decoded.userId },
        include: { answers: true, questions: true, jd: true, resume: true },
        orderBy: { startedAt: "desc" },
      }),
      prisma.resumeAnalysis.findMany({
        where: { userId: decoded.userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalInterviews = interviewSessions.length;
    const completedInterviews = interviewSessions.filter((s) => s.status === "COMPLETED").length;

    const completedWithScores = interviewSessions.filter(
      (s) => s.status === "COMPLETED" && s.score !== null
    );
    const averageScore =
      completedWithScores.length > 0
        ? completedWithScores.reduce((sum, s) => sum + (s.score || 0), 0) / completedWithScores.length
        : 0;

    const recentInterviews = interviewSessions.slice(0, 10).map((s) => ({
      id: s.id,
      score: s.score,
      startedAt: s.startedAt,
      status: s.status,
      jdData: s.jd?.parsedData,
    }));

    // Skills analysis
    const skillsMap = new Map();
    interviewSessions.forEach((s) => {
      const skills = Array.isArray(s.jd?.parsedData?.skills) ? s.jd.parsedData.skills : [];
      skills.forEach((skill) => {
        if (!skillsMap.has(skill)) skillsMap.set(skill, { scores: [], count: 0 });
        if (s.score !== null) skillsMap.get(skill).scores.push(s.score);
        skillsMap.get(skill).count += 1;
      });
    });
    const skillsAnalysis = Array.from(skillsMap.entries())
      .map(([skill, d]) => ({
        skill,
        averageScore: d.scores.length > 0 ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : 0,
        count: d.count,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);

    // Monthly progress
    const monthlyMap = new Map();
    interviewSessions.forEach((s) => {
      const d = new Date(s.startedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const month = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!monthlyMap.has(key)) monthlyMap.set(key, { month, interviews: 0, scores: [] });
      monthlyMap.get(key).interviews += 1;
      if (s.score !== null) monthlyMap.get(key).scores.push(s.score);
    });
    const monthlyProgress = Array.from(monthlyMap.entries())
      .map(([, d]) => ({
        month: d.month,
        interviews: d.interviews,
        averageScore: d.scores.length > 0 ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : 0,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);

    // Resume analytics
    const resumeAnalytics = resumeAnalyses.map((a) => {
      const parse = (val) => {
        try { return typeof val === "string" ? JSON.parse(val) : val || []; }
        catch { return []; }
      };
      return {
        id: a.id,
        fileName: a.fileName,
        createdAt: a.createdAt,
        score: a.overallScore,
        detailedScores: typeof a.detailedScores === "string" ? JSON.parse(a.detailedScores) : a.detailedScores || {},
        strengths: parse(a.strengths),
        weaknesses: parse(a.weaknesses),
        suggestions: parse(a.suggestions),
        jobDescription: a.jobDescription,
      };
    });

    const resumesWithScores = resumeAnalytics.filter((r) => r.score !== null);
    const averageResumeScore =
      resumesWithScores.length > 0
        ? Math.round(resumesWithScores.reduce((sum, r) => sum + r.score, 0) / resumesWithScores.length)
        : 0;

    const resumeSkillsMap = new Map();
    resumeAnalytics.forEach((a) => {
      if (a.detailedScores && typeof a.detailedScores === "object") {
        Object.entries(a.detailedScores).forEach(([skill, score]) => {
          if (!resumeSkillsMap.has(skill)) resumeSkillsMap.set(skill, { count: 0, scores: [] });
          resumeSkillsMap.get(skill).count += 1;
          if (typeof score === "number") resumeSkillsMap.get(skill).scores.push(score);
        });
      }
    });
    const resumeSkillsAnalysis = Array.from(resumeSkillsMap.entries())
      .map(([skill, d]) => ({
        skill,
        count: d.count,
        averageScore: d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      analytics: {
        totalInterviews,
        completedInterviews,
        averageScore,
        recentInterviews,
        skillsAnalysis,
        monthlyProgress,
        resumeAnalytics: {
          totalResumes: resumeAnalyses.length,
          averageResumeScore,
          recentResumes: resumeAnalytics.slice(0, 5),
          resumeSkillsAnalysis,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
