import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import { isValidStatusTransition } from "@/lib/utils";
import { Status } from "@prisma/client";

const statusSchema = z.object({
  status: z.enum([
    "OPEN",
    "ACKNOWLEDGED",
    "IN_PROGRESS",
    "ESCALATED",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
  ]),
  note: z.string().optional(),
  resolutionNote: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
});

// PATCH /api/tickets/[id]/status — Update ticket status
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

    const body = await req.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const { status: newStatus, note, resolutionNote, rating } = parsed.data;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { student: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Authorization checks
    if (
      user.role === "STAFF" &&
      ticket.assignedToId !== user.id &&
      user.role !== "DEPT_ADMIN" &&
      user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { success: false, message: "You are not assigned to this ticket" },
        { status: 403 }
      );
    }

    // Students can only close or rate
    if (
      user.role === "STUDENT" &&
      !["CLOSED"].includes(newStatus)
    ) {
      return NextResponse.json(
        { success: false, message: "Students can only close resolved tickets" },
        { status: 403 }
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(ticket.status, newStatus as Status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status transition: ${ticket.status} → ${newStatus}`,
        },
        { status: 400 }
      );
    }

    // Build update payload
    const now = new Date();
    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === "ACKNOWLEDGED") updateData.acknowledgedAt = now;
    if (newStatus === "RESOLVED") {
      updateData.resolvedAt = now;
      if (resolutionNote) updateData.resolutionNote = resolutionNote;
    }
    if (newStatus === "CLOSED") {
      updateData.closedAt = now;
      if (rating) updateData.rating = rating;
    }
    if (newStatus === "REOPENED") updateData.reopenedAt = now;

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Log to timeline
    await prisma.ticketTimeline.create({
      data: {
        ticketId,
        actorId: user.id,
        action: "STATUS_CHANGED",
        oldStatus: ticket.status,
        newStatus: newStatus as Status,
        note: note ?? `Status changed to ${newStatus}`,
      },
    });

    // Notify student on status changes (if someone else changed it)
    if (user.id !== ticket.studentId) {
      await prisma.notification.create({
        data: {
          userId: ticket.studentId,
          ticketId,
          message: `Your ticket "${ticket.title}" status changed to ${newStatus}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Ticket status updated to ${newStatus}`,
      data: updatedTicket,
    });
  } catch (err) {
    console.error("[PATCH /api/tickets/[id]/status]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(handler, "STUDENT");
