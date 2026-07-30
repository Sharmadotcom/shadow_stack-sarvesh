import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import { getSlaStatus } from "@/lib/utils";
import { Status, Priority } from "@prisma/client";

// GET /api/tickets/my — Student's own tickets
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

    const where: { studentId: number; status?: Status } = {
      studentId: user.id,
    };
    if (status) where.status = status;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: { select: { attachments: true, timeline: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const ticketsWithSla = tickets.map((t) => ({
      ...t,
      sla: getSlaStatus(t),
    }));

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
    console.error("[GET /api/tickets/my]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, "STUDENT");
