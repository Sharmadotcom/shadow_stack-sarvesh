import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import { Status, Priority } from "@prisma/client";
import { getSlaStatus } from "@/lib/utils";

// GET /api/admin/dashboard — Kanban board + metrics
async function handler(
  req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  try {
    // Build category filter for DEPT_ADMIN
    const categoryFilter =
      user.role === "DEPT_ADMIN" && user.id
        ? {
            team: {
              some: { userId: user.id },
            },
          }
        : undefined;

    // ─── Category board (tickets by status) ──────────────────────────────────

    const categories = await prisma.category.findMany({
      where: categoryFilter
        ? { ...categoryFilter, isRestricted: false }
        : { isRestricted: false },
      include: {
        tickets: {
          where: {
            status: {
              notIn: [Status.CLOSED],
            },
          },
          include: {
            student: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: { slaDeadlineAck: "asc" },
        },
        _count: { select: { team: true, tickets: true } },
      },
    });

    // Attach SLA to each ticket
    const board = categories.map((cat) => ({
      ...cat,
      tickets: cat.tickets.map((t) => ({ ...t, sla: getSlaStatus(t) })),
      byStatus: {
        OPEN: cat.tickets.filter((t) => t.status === Status.OPEN).length,
        ACKNOWLEDGED: cat.tickets.filter(
          (t) => t.status === Status.ACKNOWLEDGED
        ).length,
        IN_PROGRESS: cat.tickets.filter((t) => t.status === Status.IN_PROGRESS)
          .length,
        ESCALATED: cat.tickets.filter((t) => t.status === Status.ESCALATED)
          .length,
        RESOLVED: cat.tickets.filter((t) => t.status === Status.RESOLVED)
          .length,
        REOPENED: cat.tickets.filter((t) => t.status === Status.REOPENED)
          .length,
      },
    }));

    // ─── Aggregate metrics ────────────────────────────────────────────────────

    const [totalTickets, escalatedCount, resolvedThisWeek, breachedCount] =
      await Promise.all([
        prisma.ticket.count(),
        prisma.ticket.count({ where: { isEscalated: true } }),
        prisma.ticket.count({
          where: {
            status: { in: [Status.RESOLVED, Status.CLOSED] },
            resolvedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.ticket.count({
          where: {
            status: { notIn: [Status.RESOLVED, Status.CLOSED] },
            slaDeadlineResolve: { lt: new Date() },
          },
        }),
      ]);

    // Average resolution time (resolved tickets)
    const resolvedTickets = await prisma.ticket.findMany({
      where: { status: { in: [Status.RESOLVED, Status.CLOSED] }, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });

    const avgResolutionMs =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((acc, t) => {
            return acc + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime());
          }, 0) / resolvedTickets.length
        : 0;

    const avgResolutionHours = Math.round(avgResolutionMs / 3600000);

    // ─── Staff load ───────────────────────────────────────────────────────────

    const staffLoad = await prisma.user.findMany({
      where: { role: { in: ["STAFF", "DEPT_ADMIN"] } },
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        ticketsAssigned: {
          where: { status: { notIn: [Status.RESOLVED, Status.CLOSED] } },
          select: { id: true, status: true, priority: true },
        },
      },
    });

    // ─── Priority breakdown ───────────────────────────────────────────────────

    const priorityBreakdown = await prisma.ticket.groupBy({
      by: ["priority"],
      _count: { priority: true },
      where: { status: { notIn: [Status.CLOSED] } },
    });

    return NextResponse.json({
      success: true,
      data: {
        board,
        metrics: {
          totalTickets,
          escalatedCount,
          resolvedThisWeek,
          breachedCount,
          avgResolutionHours,
          breachRate:
            totalTickets > 0
              ? Math.round((breachedCount / totalTickets) * 100)
              : 0,
        },
        staffLoad: staffLoad.map((s) => ({
          ...s,
          activeTicketCount: s.ticketsAssigned.length,
        })),
        priorityBreakdown,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/dashboard]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, "DEPT_ADMIN");
