import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import { getSlaStatus } from "@/lib/utils";
import { Status } from "@prisma/client";

// GET /api/tickets/assigned — Staff's assigned ticket queue, sorted by SLA urgency
async function handler(
  req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") as Status | null;
    const skip = (page - 1) * limit;

    const where: { assignedToId: number; status?: Status } = {
      assignedToId: user.id,
    };
    if (status) where.status = status;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        // Sort by SLA deadline ascending (most urgent first)
        orderBy: [{ slaDeadlineAck: "asc" }, { priority: "desc" }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          student: { select: { id: true, name: true, email: true } },
          _count: { select: { attachments: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    // Attach SLA status and sort by urgency
    const ticketsWithSla = tickets
      .map((t) => ({ ...t, sla: getSlaStatus(t) }))
      .sort((a, b) => a.sla.resolveCountdownMs - b.sla.resolveCountdownMs);

    return NextResponse.json({
      success: true,
      data: {
        tickets: ticketsWithSla,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/tickets/assigned]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, "STAFF");
