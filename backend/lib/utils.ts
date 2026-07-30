import { Priority, Status } from "@prisma/client";

// ─── Ticket Code Generator ─────────────────────────────────────────────────────

export function generateTicketCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `GRV-${year}-${random}`;
}

// ─── SLA Deadline Computation ──────────────────────────────────────────────────

interface SlaConfig {
  ackHours: number;
  resolveHours: number;
}

const DEFAULT_SLA: Record<Priority, SlaConfig> = {
  CRITICAL: { ackHours: 2, resolveHours: 24 },
  HIGH: { ackHours: 4, resolveHours: 48 },
  MEDIUM: { ackHours: 24, resolveHours: 120 }, // 5 days
  LOW: { ackHours: 48, resolveHours: 168 }, // 7 days
};

export function computeSlaDeadlines(
  priority: Priority,
  slaAckHours?: number,
  slaResolveHours?: number
): { slaDeadlineAck: Date; slaDeadlineResolve: Date } {
  const now = new Date();
  const config = DEFAULT_SLA[priority];

  const ackHours = slaAckHours ?? config.ackHours;
  const resolveHours = slaResolveHours ?? config.resolveHours;

  const slaDeadlineAck = new Date(now.getTime() + ackHours * 60 * 60 * 1000);
  const slaDeadlineResolve = new Date(
    now.getTime() + resolveHours * 60 * 60 * 1000
  );

  return { slaDeadlineAck, slaDeadlineResolve };
}

// ─── SLA Status Helpers ────────────────────────────────────────────────────────

export function getSlaStatus(ticket: {
  status: Status;
  slaDeadlineAck: Date;
  slaDeadlineResolve: Date;
  acknowledgedAt: Date | null;
  isEscalated: boolean;
}): {
  ackBreached: boolean;
  resolveBreached: boolean;
  ackCountdownMs: number;
  resolveCountdownMs: number;
  label: string;
} {
  const now = Date.now();
  const ackDeadline = new Date(ticket.slaDeadlineAck).getTime();
  const resolveDeadline = new Date(ticket.slaDeadlineResolve).getTime();

  const ackBreached =
    !ticket.acknowledgedAt && now > ackDeadline;
  const resolveBreached =
    !["RESOLVED", "CLOSED"].includes(ticket.status) && now > resolveDeadline;

  const ackCountdownMs = Math.max(0, ackDeadline - now);
  const resolveCountdownMs = Math.max(0, resolveDeadline - now);

  let label = "On Track";
  if (ticket.isEscalated) label = "Escalated";
  else if (resolveBreached) label = "Resolution SLA Breached";
  else if (ackBreached) label = "Acknowledgement SLA Breached";

  return { ackBreached, resolveBreached, ackCountdownMs, resolveCountdownMs, label };
}

// ─── Format duration ms → human readable ──────────────────────────────────────

export function formatDuration(ms: number): string {
  if (ms <= 0) return "Overdue";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── API Response Helpers ──────────────────────────────────────────────────────

export function successResponse<T>(data: T, message?: string) {
  return { success: true, message, data };
}

export function errorResponse(message: string, statusCode = 400) {
  return { success: false, message, statusCode };
}

// ─── Status transition validation ─────────────────────────────────────────────

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  OPEN: ["ACKNOWLEDGED", "ESCALATED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "ESCALATED"],
  IN_PROGRESS: ["RESOLVED", "ESCALATED"],
  ESCALATED: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "ACKNOWLEDGED"],
};

export function isValidStatusTransition(from: Status, to: Status): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
