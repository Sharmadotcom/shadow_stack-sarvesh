import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";
import {
  generateTicketCode,
  computeSlaDeadlines,
  getSlaStatus,
} from "@/lib/utils";
import { getRoundRobinAssignee } from "@/lib/assignment";
import { Priority, Status } from "@prisma/client";

const createTicketSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  categoryId: z.number().int().positive(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  location: z.string().min(2).max(200),
});

// ─── POST /api/tickets — Create new ticket ────────────────────────────────────

async function createTicketHandler(
  req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const { title, description, categoryId, location, priority } = parsed.data;

    // Fetch category
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    // Determine effective priority
    const effectivePriority: Priority =
      priority ?? (category.defaultPriority as Priority);

    // Compute SLA deadlines
    const { slaDeadlineAck, slaDeadlineResolve } = computeSlaDeadlines(
      effectivePriority,
      category.slaAckHours,
      category.slaResolveHours
    );

    // Auto-assign to least-loaded staff in category
    const assignedToId = await getRoundRobinAssignee(categoryId);

    // Generate ticket code
    const ticketCode = generateTicketCode();

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketCode,
        studentId: user.id,
        categoryId,
        title,
        description,
        priority: effectivePriority,
        location,
        status: Status.OPEN,
        assignedToId,
        slaDeadlineAck,
        slaDeadlineResolve,
      },
      include: {
        category: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Log creation in timeline
    await prisma.ticketTimeline.create({
      data: {
        ticketId: ticket.id,
        actorId: user.id,
        action: "CREATED",
        newStatus: Status.OPEN,
        note: `Ticket created and assigned to ${ticket.assignedTo?.name ?? "Unassigned"}`,
      },
    });

    // Create in-app notification for the assigned staff
    if (assignedToId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          ticketId: ticket.id,
          message: `You have been assigned a new ticket: "${ticket.title}" (${ticket.ticketCode})`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Ticket created successfully",
        data: ticket,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/tickets]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/tickets — List tickets (role-based) ─────────────────────────────

async function listTicketsHandler(
  req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") as Status | null;
    const priority = searchParams.get("priority") as Priority | null;

    const skip = (page - 1) * limit;

    // Build where clause based on role
    type WhereClause = {
      studentId?: number;
      assignedToId?: number;
      status?: Status;
      priority?: Priority;
      category?: { isRestricted?: boolean };
    };

    let where: WhereClause = {};

    if (user.role === "STUDENT") {
      where.studentId = user.id;
    } else if (user.role === "STAFF") {
      where.assignedToId = user.id;
    }
    // DEPT_ADMIN and SUPER_ADMIN see all tickets (with restricted category filter applied separately)

    if (status) where.status = status;
    if (priority) where.priority = priority;

    // Non-super-admins can't see restricted (harassment) tickets unless they are the student who raised it
    if (user.role === "DEPT_ADMIN") {
      where.category = { isRestricted: false };
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          student: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: { select: { attachments: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    // Attach SLA info to each ticket
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
    console.error("[GET /api/tickets]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createTicketHandler, "STUDENT");
export const GET = withAuth(listTicketsHandler, "STUDENT");
