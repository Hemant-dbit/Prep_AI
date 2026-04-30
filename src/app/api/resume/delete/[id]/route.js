import { NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib/auth";
import { prisma } from "@/server/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function DELETE(request, { params }) {
  const { decoded, error } = verifyAuth(request);
  if (error) return error;

  const { id } = await params;

  try {
    const resume = await prisma.resume.findFirst({
      where: { id, userId: decoded.userId },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found or unauthorized" }, { status: 404 });
    }

    if (resume.file_path) {
      try {
        await fs.unlink(path.join(process.cwd(), "public", resume.file_path));
      } catch {
        // File already gone — not a fatal error
      }
    }

    await prisma.resume.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Resume deleted successfully" });
  } catch {
    return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 });
  }
}
