import { prisma } from "./db";
import { Status, Role } from "@prisma/client";

const SYSTEM_USER_ID = parseInt(process.env.SYSTEM_USER_ID || "1", 10);

// ─── Escalation Check (called by cron every 5 minutes) ────────────────────────

export async function runEscalationCheck(): Promise<void> {
  console.log("[SLA] Running escalation check at", new Date().toISOString());

  const now = new Date();

  // Fetch all non-terminal tickets
  const openTickets = await prisma.ticket.findMany({
    where: {
      status: {
        in: [
          Status.OPEN,
          Status.ACKNOWLEDGED,
          Status.IN_PROGRESS,
          Status.REOPENED,
          Status.ESCALATED,
        ],
      },
    },
    include: {
      category: true,
    },
  });

  console.log(`[SLA] Checking ${openTickets.length} open ticket(s)`);

  for (const ticket of openTickets) {
    try {
      await processTicketEscalation(ticket, now);
    } catch (err) {
      console.error(`[SLA] Error processing ticket ${ticket.id}:`, err);
    }
  }
}

// ─── Per-ticket escalation logic ──────────────────────────────────────────────

async function processTicketEscalation(
  ticket: {
    id: number;
    status: Status;
    slaDeadlineAck: Date;
    slaDeadlineResolve: Date;
    acknowledgedAt: Date | null;
    isEscalated: boolean;
    escalationTier: number;
    studentId: number;
    assignedToId: number | null;
    category: { isRestricted: boolean };
  },
  now: Date
): Promise<void> {
  const ackOverdue =
    ticket.status === Status.OPEN &&
    !ticket.acknowledgedAt &&
    now > ticket.slaDeadlineAck;

  const resolveOverdue =
    [
      Status.ACKNOWLEDGED,
      Status.IN_PROGRESS,
      Status.REOPENED,
      Status.ESCALATED,
    ].includes(ticket.status) &&
    now > ticket.slaDeadlineResolve;

  if (ackOverdue && ticket.escalationTier < 2) {
    // Tier 1 → 2: ack SLA breached → escalate to Dept Admin
    await escalateTicket(
      ticket.id,
      2,
      "SLA breach — acknowledgement overdue. Escalated to Department Admin."
    );
    await notifyEscalation(ticket, 2);
  } else if (resolveOverdue && ticket.escalationTier < 3) {
    // Tier 2 → 3: resolve SLA breached → escalate to Super Admin
    const nextTier = ticket.escalationTier + 1;
    await escalateTicket(
      ticket.id,
      nextTier,
      `SLA breach — resolution overdue. Escalated to ${
        nextTier === 2 ? "Department Admin" : "Super Admin"
      }.`
    );
    await notifyEscalation(ticket, nextTier);
  }
}

// ─── Escalate a ticket ────────────────────────────────────────────────────────

async function escalateTicket(
  ticketId: number,
  tier: number,
  note: string
): Promise<void> {
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      isEscalated: true,
      escalationTier: tier,
      status: Status.ESCALATED,
    },
  });

  await prisma.ticketTimeline.create({
    data: {
      ticketId,
      actorId: SYSTEM_USER_ID,
      action: "ESCALATION",
      oldStatus: Status.OPEN, // simplified; actual old status resolved in caller if needed
      newStatus: Status.ESCALATED,
      note,
    },
  });

  console.log(`[SLA] Ticket #${ticketId} escalated to tier ${tier}: ${note}`);
}

// ─── Notify relevant parties on escalation ────────────────────────────────────

async function notifyEscalation(
  ticket: { id: number; studentId: number; assignedToId: number | null },
  tier: number
): Promise<void> {
  const targetRole: Role = tier >= 3 ? Role.SUPER_ADMIN : Role.DEPT_ADMIN;

  // Find users with the target role
  const targets = await prisma.user.findMany({
    where: { role: targetRole },
    select: { id: true },
  });

  const notifications = targets.map((u) => ({
    userId: u.id,
    ticketId: ticket.id,
    message: `Ticket #${ticket.id} has been escalated to tier ${tier} due to SLA breach.`,
  }));

  // Also notify the original student
  notifications.push({
    userId: ticket.studentId,
    ticketId: ticket.id,
    message: `Your ticket #${ticket.id} has been escalated due to an SLA breach.`,
  });

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }
}
