import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

const CATEGORY_MAP = {
  interview: "INTERVIEW",
  learning: "LEARNING",
  practice: "PRACTICE",
  resume: "RESUME",
};

export async function GET(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  try {
    const goals = await prisma.goal.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ goals });
  } catch {
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { title, description, category, targetDate } = await request.json();

  if (!title || !category || !targetDate) {
    return NextResponse.json(
      { error: "Title, category, and target date are required" },
      { status: 400 }
    );
  }

  const goalCategory = CATEGORY_MAP[category];
  if (!goalCategory) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  try {
    const goal = await prisma.goal.create({
      data: {
        userId: decoded.userId,
        title,
        description: description || "",
        category: goalCategory,
        targetDate: new Date(targetDate),
        completed: false,
        progress: 0,
      },
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
