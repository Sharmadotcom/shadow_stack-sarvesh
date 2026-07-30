import { prisma } from "../lib/prisma";

export async function checkAndEscalateSLABreaches() {
  try {
    const now = new Date();

    // Find active complaints past SLA deadline that haven't been escalated
    const breached = await prisma.complaint.findMany({
      where: {
        slaDeadline: { lt: now },
        status: { in: ["open", "assigned", "in_progress"] },
        isEscalated: false,
      },
      include: { submittedBy: true },
    });

    if (breached.length === 0) return;

    console.log(`[SLA Engine] Found ${breached.length} breached complaint(s). Escalating...`);

    for (const c of breached) {
      await prisma.complaint.update({
        where: { id: c.id },
        data: {
          status: "escalated",
          priority: "critical",
          isEscalated: true,
          escalatedAt: now,
          escalationReason: "AUTOMATIC SLA BREACH: Target response time exceeded.",
        },
      });

      // System audit log
      await prisma.auditLog.create({
        data: {
          complaintId: c.id,
          changedById: c.submittedById,
          oldStatus: c.status,
          newStatus: "escalated",
          oldPriority: c.priority,
          newPriority: "critical",
          comment: `AUTOMATIC SLA ESCALATION: Response window expired (${c.slaDeadline.toISOString()}). Escalated to Critical priority.`,
        },
      });

      console.log(`[SLA Engine] Auto-escalated ${c.id} to Critical.`);
    }
  } catch (error) {
    console.error("[SLA Engine] Error running SLA check:", error);
  }
}
