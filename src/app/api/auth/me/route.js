import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { verifyAuth } from "@/server/lib/auth";
import { excludePassword } from "@/server/lib/helpers";

export async function GET(request) {
  const { decoded, error } = verifyAuth(request);
  if (error) return NextResponse.json({ success: false, message: "No authorization token" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: excludePassword(user) });
  } catch {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
