import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/rbac";

// GET /api/auth/me — returns current authenticated user info
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

// POST /api/auth/logout — clears auth cookie
export async function POST(_req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return response;
}
