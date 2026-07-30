import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import { runEscalationCheck } from "@/lib/escalation";

// GET /api/admin/escalation/trigger — Manual escalation trigger (debug/demo tool)
async function handler(
  _req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Only Super Admin can trigger manual escalation" },
      { status: 403 }
    );
  }

  try {
    console.log(`[MANUAL] Escalation triggered by user ${user.id} (${user.email})`);
    await runEscalationCheck();

    return NextResponse.json({
      success: true,
      message: "Escalation check completed — check server logs for details",
      triggeredAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[GET /api/admin/escalation/trigger]", err);
    return NextResponse.json(
      { success: false, message: "Escalation check failed" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, "SUPER_ADMIN");
