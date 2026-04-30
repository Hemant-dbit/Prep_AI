import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { generateToken, hashPassword } from "@/server/lib/helpers";
import crypto from "crypto";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";

    if (!code) {
      return NextResponse.json({ success: false, message: "Missing code from Google" }, { status: 400 });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      console.error("Google token exchange failed", tokenData);
      return NextResponse.json({ success: false, message: "Google authentication failed" }, { status: 400 });
    }

    // Decode JWT payload (trusting Google's signature)
    const payload = JSON.parse(Buffer.from(tokenData.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    const email = payload.email;
    const name = payload.name || email.split("@")[0];

    if (!email) {
      return NextResponse.json({ success: false, message: "Google account has no email" }, { status: 400 });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
        },
      });
    }

    const token = generateToken(user.id);
    return NextResponse.redirect(`${baseUrl}/home/dashboard#token=${token}`);
  } catch (err) {
    console.error("Google callback error", err);
    return NextResponse.json({ success: false, message: "Authentication failed" }, { status: 500 });
  }
}
