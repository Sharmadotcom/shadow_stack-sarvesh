import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import { Status } from "@prisma/client";

const reassignSchema = z.object({
  assignedToId: z.number().int().positive(),
  note: z.string().optional(),
});

// POST /api/admin/reassign/[id] — Reassign ticket to different staff
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
    const parsed = reassignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const { assignedToId, note } = parsed.data;

    // Verify target user exists and is STAFF or above
    const targetUser = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!targetUser || !["STAFF", "DEPT_ADMIN", "SUPER_ADMIN"].includes(targetUser.role)) {
      return NextResponse.json(
        { success: false, message: "Target user not found or not eligible for assignment" },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    const previousAssignee = ticket.assignedToId;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId },
    });

    // Log to timeline
    await prisma.ticketTimeline.create({
      data: {
        ticketId,
        actorId: user.id,
        action: "REASSIGNED",
        note: note ?? `Reassigned from user #${previousAssignee ?? "none"} to ${targetUser.name}`,
      },
    });

    // Notify new assignee
    await prisma.notification.create({
      data: {
        userId: assignedToId,
        ticketId,
        message: `You have been assigned ticket "${ticket.title}" (${ticket.ticketCode})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Ticket reassigned to ${targetUser.name}`,
      data: updated,
    });
  } catch (err) {
    console.error("[POST /api/admin/reassign/[id]]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, "DEPT_ADMIN");
