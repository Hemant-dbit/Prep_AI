import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { hashPassword, generateToken, excludePassword, validateEmail, validatePasswordDetailed, validateName } from "@/server/lib/helpers";

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    if (!validateEmail(email)) {
      return NextResponse.json({ success: false, message: "Please provide a valid email" }, { status: 400 });
    }

    const pwdValidation = validatePasswordDetailed(password);
    if (!pwdValidation.valid) {
      return NextResponse.json({ success: false, errors: pwdValidation.errors.map((msg) => ({ msg })) }, { status: 400 });
    }

    if (!validateName(name)) {
      return NextResponse.json({ success: false, message: "Name must be at least 2 characters long" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ success: false, message: "User with this email already exists" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        name: name.trim(),
      },
    });

    return NextResponse.json(
      { success: true, message: "User created successfully", data: { user: excludePassword(user), token: generateToken(user.id) } },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
