import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface DecodedToken {
  userId: string;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verifies the Bearer token from the Authorization header.
 * Returns the decoded token payload on success.
 * Returns a NextResponse error on failure — caller should return it immediately.
 */
export function verifyAuth(
  request: NextRequest
): { decoded: DecodedToken; error: null } | { decoded: null; error: NextResponse } {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      decoded: null,
      error: NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return { decoded, error: null };
  } catch {
    return {
      decoded: null,
      error: NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }
}
