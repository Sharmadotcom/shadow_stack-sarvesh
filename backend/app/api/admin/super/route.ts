import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import { Status } from "@prisma/client";
import { getSlaStatus } from "@/lib/utils";

// GET /api/admin/super — Super admin cross-category overview + escalation feed
async function handler(
  req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  _user: JwtPayload
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // ─── Escalated tickets feed ───────────────────────────────────────────────

    const escalatedTickets = await prisma.ticket.findMany({
      where: { isEscalated: true, status: { notIn: [Status.CLOSED] } },
      orderBy: { escalationTier: "desc" },
      take: limit,
      include: {
        category: true,
        student: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const escalatedWithSla = escalatedTickets.map((t) => ({
      ...t,
      sla: getSlaStatus(t),
    }));

    // ─── Cross-category heatmap data ──────────────────────────────────────────

    const heatmap = await prisma.ticket.groupBy({
      by: ["categoryId", "status"],
      _count: { id: true },
      where: { status: { notIn: [Status.CLOSED] } },
    });

    // ─── Top recurring locations ──────────────────────────────────────────────

    const locationGroups = await prisma.ticket.groupBy({
      by: ["location"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // ─── Recent notifications / events ───────────────────────────────────────

    const recentTimeline = await prisma.ticketTimeline.findMany({
      where: { action: { in: ["ESCALATION", "CREATED", "STATUS_CHANGED"] } },
      orderBy: { timestamp: "desc" },
      take: 20,
      include: {
        ticket: {
          select: {
            id: true,
            ticketCode: true,
            title: true,
            category: { select: { name: true } },
          },
        },
        actor: { select: { id: true, name: true, role: true } },
      },
    });

    // ─── System-wide stats ────────────────────────────────────────────────────

    const [totalUsers, totalTickets, openTickets, resolvedThisWeek] =
      await Promise.all([
        prisma.user.count({ where: { isSystem: false } }),
        prisma.ticket.count(),
        prisma.ticket.count({
          where: { status: { notIn: [Status.RESOLVED, Status.CLOSED] } },
        }),
        prisma.ticket.count({
          where: {
            status: { in: [Status.RESOLVED, Status.CLOSED] },
            resolvedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        escalatedTickets: escalatedWithSla,
        heatmap,
        topLocations: locationGroups,
        recentActivity: recentTimeline,
        stats: { totalUsers, totalTickets, openTickets, resolvedThisWeek },
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/super]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, "SUPER_ADMIN");
