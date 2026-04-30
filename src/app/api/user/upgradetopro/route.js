import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";

export async function POST(request) {
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

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { isPremium: true },
    });

    return NextResponse.json({ message: "User upgraded to Premium successfully" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
