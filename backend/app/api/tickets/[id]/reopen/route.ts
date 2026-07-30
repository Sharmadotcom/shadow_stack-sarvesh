import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import { Status } from "@prisma/client";

const REOPEN_GRACE_HOURS = 48;

// POST /api/tickets/[id]/reopen — Student reopens a resolved/closed ticket
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

    const body = await req.json().catch(() => ({}));
    const note = body?.note ?? "Reopened by student — issue not resolved.";

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Only the student who raised it can reopen
    if (ticket.studentId !== user.id) {
      return NextResponse.json(
        { success: false, message: "You can only reopen your own tickets" },
        { status: 403 }
      );
    }

    // Can only reopen RESOLVED or CLOSED tickets
    if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot reopen a ticket with status: ${ticket.status}`,
        },
        { status: 400 }
      );
    }

    // Enforce grace window: only within 48 hours of resolution/closure
    const referenceTime =
      ticket.closedAt ?? ticket.resolvedAt ?? ticket.createdAt;
    const hoursSinceResolution =
      (Date.now() - new Date(referenceTime).getTime()) / 3600000;

    if (hoursSinceResolution > REOPEN_GRACE_HOURS) {
      return NextResponse.json(
        {
          success: false,
          message: `Reopen window expired — tickets can only be reopened within ${REOPEN_GRACE_HOURS} hours of resolution`,
        },
        { status: 400 }
      );
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: Status.REOPENED,
        reopenedAt: new Date(),
        resolvedAt: null,
        closedAt: null,
      },
    });

    // Log to timeline
    await prisma.ticketTimeline.create({
      data: {
        ticketId,
        actorId: user.id,
        action: "REOPENED",
        oldStatus: ticket.status,
        newStatus: Status.REOPENED,
        note,
      },
    });

    // Notify assigned staff
    if (ticket.assignedToId) {
      await prisma.notification.create({
        data: {
          userId: ticket.assignedToId,
          ticketId,
          message: `Ticket "${ticket.title}" has been reopened by the student.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Ticket reopened successfully",
      data: updatedTicket,
    });
  } catch (err) {
    console.error("[POST /api/tickets/[id]/reopen]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, "STUDENT");
