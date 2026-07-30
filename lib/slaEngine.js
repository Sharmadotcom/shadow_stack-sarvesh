/**
 * SLA Rules Configuration (Resolution hours based on Priority)
 */
export const SLA_CONFIG = {
  CRITICAL: { responseHours: 1, resolutionHours: 1 },    // 1 Hour Emergency Incident
  HIGH:     { responseHours: 2, resolutionHours: 6 },    // 6 Hours High Priority
  MEDIUM:   { responseHours: 4, resolutionHours: 24 },   // 24 Hours Standard Maintenance
  LOW:      { responseHours: 8, resolutionHours: 48 },   // 48 Hours Minor Issue
};

/**
 * Calculates SLA deadline date based on priority
 * @param {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'} priority 
 */
export function calculateSLADeadline(priority = 'MEDIUM') {
  const hours = SLA_CONFIG[priority]?.resolutionHours || 24;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return { slaHours: hours, slaDeadline: deadline };
}

/**
 * Evaluates ticket countdown status
 * @param {Object} grievance 
 */
export function getTicketSLAStatus(grievance) {
  if (!grievance || !grievance.slaDeadline) return null;

  const now = new Date();
  const deadline = new Date(grievance.slaDeadline);
  const diffMs = deadline - now;
  const isBreached = diffMs < 0 || grievance.slaBreached;

  const absoluteDiffSeconds = Math.abs(Math.floor(diffMs / 1000));
  const hours = Math.floor(absoluteDiffSeconds / 3600);
  const minutes = Math.floor((absoluteDiffSeconds % 3600) / 60);

  return {
    isBreached,
    slaHoursTotal: grievance.slaHours,
    deadline: deadline.toISOString(),
    remainingFormatted: isBreached
      ? `SLA Breached by ${hours}h ${minutes}m`
      : `${hours}h ${minutes}m remaining`,
    escalationLevel: grievance.escalationLevel,
  };
}

/**
 * Evaluates overdue tickets and triggers auto-escalation rules
 * @param {import('@prisma/client').PrismaClient} prisma 
 */
export async function runSLAEscalationCheck(prisma) {
  const now = new Date();

  // Find all active tickets past their SLA deadline that have not reached max escalation
  const overdueTickets = await prisma.grievance.findMany({
    where: {
      status: { notIn: ['RESOLVED', 'CLOSED'] },
      slaDeadline: { lt: now },
      escalationLevel: { lt: 2 }, // Level 0: Staff, Level 1: HOD, Level 2: Dean/Admin
    },
  });

  const escalationResults = [];

  for (const ticket of overdueTickets) {
    const nextLevel = ticket.escalationLevel + 1;
    const escalationTargetRole = nextLevel === 1 ? 'DEPT_HEAD' : 'ADMIN';

    const updated = await prisma.grievance.update({
      where: { id: ticket.id },
      data: {
        slaBreached: true,
        escalationLevel: nextLevel,
        status: 'ESCALATED',
        escalatedAt: now,
        auditLogs: {
          create: {
            action: 'AUTO_ESCALATED',
            performedBy: ticket.createdById, // System triggered action
            details: `AUTOMATIC ESCALATION: Resolution deadline missed. Ticket escalated to ${escalationTargetRole} (Level ${nextLevel}).`,
          },
        },
      },
    });

    escalationResults.push(updated);
  }

  return {
    checkedCount: overdueTickets.length,
    escalatedTickets: escalationResults,
  };
}
