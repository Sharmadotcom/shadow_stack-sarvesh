import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { verifyJwt, extractTokenFromHeader, JwtPayload } from "./jwt";

// ─── Get current user from request ────────────────────────────────────────────

export function getUserFromRequest(req: NextRequest): JwtPayload | null {
  // 1. Try Authorization header
  const authHeader = req.headers.get("authorization");
  const headerToken = extractTokenFromHeader(authHeader);
  if (headerToken) {
    const payload = verifyJwt(headerToken);
    if (payload) return payload;
  }

  // 2. Try httpOnly cookie
  const cookieToken = req.cookies.get("auth_token")?.value;
  if (cookieToken) {
    const payload = verifyJwt(cookieToken);
    if (payload) return payload;
  }

  return null;
}

// ─── Role hierarchy ────────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<Role, number> = {
  STUDENT: 1,
  STAFF: 2,
  DEPT_ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ─── RBAC Guard HOF ───────────────────────────────────────────────────────────
// Wraps a route handler and enforces minimum role requirement

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler, minRole?: Role) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized — please log in" },
        { status: 401 }
      );
    }

    if (minRole && !hasRole(user.role, minRole)) {
      return NextResponse.json(
        {
          success: false,
          message: `Forbidden — requires ${minRole} or above`,
        },
        { status: 403 }
      );
    }

    return handler(req, ctx, user);
  };
}

// ─── Convenience wrappers ──────────────────────────────────────────────────────

export const withStudent = (h: RouteHandler) => withAuth(h, "STUDENT");
export const withStaff = (h: RouteHandler) => withAuth(h, "STAFF");
export const withDeptAdmin = (h: RouteHandler) => withAuth(h, "DEPT_ADMIN");
export const withSuperAdmin = (h: RouteHandler) => withAuth(h, "SUPER_ADMIN");
