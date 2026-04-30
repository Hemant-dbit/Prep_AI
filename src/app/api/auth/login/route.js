import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { comparePassword, generateToken, excludePassword, validateEmail } from "@/lib/auth/helpers";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!validateEmail(email)) {
      return NextResponse.json({ success: false, message: "Please provide a valid email" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ success: false, message: "Password is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: { user: excludePassword(user), token: generateToken(user.id) },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
