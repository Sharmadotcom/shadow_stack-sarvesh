import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";

const roleSchema = z.object({
  role: z.enum(["STUDENT", "STAFF", "DEPT_ADMIN", "SUPER_ADMIN"]),
  department: z.string().optional(),
});

// PATCH /api/admin/users/[id]/role — Promote or demote user role (SUPER_ADMIN only)
async function handler(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Only Super Admin can change user roles" },
      { status: 403 }
    );
  }

  try {
    const { id } = await ctx.params;
    const targetId = parseInt(id, 10);

    if (isNaN(targetId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    // Prevent self-demotion
    if (targetId === user.id) {
      return NextResponse.json(
        { success: false, message: "You cannot change your own role" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target || target.isSystem) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        role: parsed.data.role,
        department: parsed.data.department,
      },
      select: { id: true, name: true, email: true, role: true, department: true },
    });

    return NextResponse.json({
      success: true,
      message: `User role updated to ${parsed.data.role}`,
      data: updated,
    });
  } catch (err) {
    console.error("[PATCH /api/admin/users/[id]/role]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(handler, "SUPER_ADMIN");
