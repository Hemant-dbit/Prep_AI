import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

const CATEGORY_MAP = {
  interview: "INTERVIEW",
  learning: "LEARNING",
  practice: "PRACTICE",
  resume: "RESUME",
};

export async function PUT(request, { params }) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { id } = await params;
  const { title, description, category, targetDate, completed, progress } = await request.json();

  try {
    const existing = await prisma.goal.findFirst({
      where: { id, userId: decoded.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetDate !== undefined) updateData.targetDate = new Date(targetDate);
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.progress = completed ? 100 : 0;
    }
    if (progress !== undefined && completed === undefined) {
      updateData.progress = Math.max(0, Math.min(100, progress));
      if (progress >= 100) updateData.completed = true;
    }
    if (category !== undefined) {
      const goalCategory = CATEGORY_MAP[category];
      if (!goalCategory) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      updateData.category = goalCategory;
    }

    const updated = await prisma.goal.update({ where: { id }, data: updateData });
    return NextResponse.json({ goal: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.goal.findFirst({
      where: { id, userId: decoded.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ message: "Goal deleted successfully" });
  } catch {
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
