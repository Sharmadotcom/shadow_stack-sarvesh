import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";

// GET /api/tickets/[id]/timeline — Full audit trail
async function handler(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const ticketId = parseInt(id, 10);

    if (isNaN(ticketId)) {
      return NextResponse.json(
        { success: false, message: "Invalid ticket ID" },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        studentId: true,
        category: { select: { isRestricted: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Access control
    if (user.role === "STUDENT" && ticket.studentId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const timeline = await prisma.ticketTimeline.findMany({
      where: { ticketId },
      orderBy: { timestamp: "asc" },
      include: {
        actor: {
          select: { id: true, name: true, role: true, isSystem: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: timeline,
    });
  } catch (err) {
    console.error("[GET /api/tickets/[id]/timeline]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, "STUDENT");
