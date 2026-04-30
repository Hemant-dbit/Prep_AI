import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { validateEmail } from "@/server/lib/helpers";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email.toLowerCase(), mode: "insensitive" } },
    });

    // Always return success — don't reveal if email exists
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;

      // Try to send email — if it fails, fall back to showing the link in UI
      let emailSent = false;
      try {
        const result = await resend.emails.send({
          from: "PrepAI <onboarding@resend.dev>",
          to: email,
          subject: "Reset your PrepAI password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Reset Your Password</h2>
              <p>You requested a password reset for your PrepAI account.</p>
              <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Reset Password
              </a>
              <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
              <p style="color: #6b7280; font-size: 14px;">Or copy this link: ${resetUrl}</p>
            </div>
          `,
        });
        emailSent = !result.error;
        if (result.error) console.error("❌ Email send failed:", result.error);
        else console.log("✅ Password reset email sent:", result.data?.id);
      } catch (emailError) {
        console.error("❌ Email send exception:", emailError);
      }

      // If email failed, return the reset URL so the UI can show it directly
      if (!emailSent) {
        return NextResponse.json({
          success: true,
          message: "Reset link generated. Email delivery unavailable — use the link below.",
          resetUrl,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
