import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import { getSlaStatus } from "@/lib/utils";

// GET /api/tickets/[id] — Ticket detail with full timeline
async function getHandler(
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
      include: {
        category: true,
        student: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true, department: true } },
        attachments: true,
        timeline: {
          orderBy: { timestamp: "asc" },
          include: {
            actor: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Access control: students can only view their own tickets
    // Dept admins can't view restricted (harassment) tickets unless they are the student
    if (user.role === "STUDENT" && ticket.studentId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    if (
      user.role === "DEPT_ADMIN" &&
      ticket.category.isRestricted &&
      ticket.studentId !== user.id
    ) {
      return NextResponse.json(
        { success: false, message: "This ticket is restricted — contact the Safety Officer" },
        { status: 403 }
      );
    }

    const sla = getSlaStatus(ticket);

    return NextResponse.json({
      success: true,
      data: { ...ticket, sla },
    });
  } catch (err) {
    console.error("[GET /api/tickets/[id]]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, "STUDENT");
