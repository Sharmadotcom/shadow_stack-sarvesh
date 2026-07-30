  import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTicketSLAStatus } from '@/lib/slaEngine';

/**
 * GET /api/grievances/[id]
 * Fetch detailed grievance history, ownership, attachments, and audit trail
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const grievance = await prisma.grievance.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true, department: true } },
        attachments: true,
        comments: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        auditLogs: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!grievance) {
      return NextResponse.json({ success: false, error: 'Grievance not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...grievance,
        slaStatus: getTicketSLAStatus(grievance),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/grievances/[id]
 * Reassign ownership, update status, or mark as resolved
 */
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, assignedToId, updatedById, note } = body;

    if (!updatedById) {
      return NextResponse.json({ success: false, error: 'updatedById is required to audit this change' }, { status: 400 });
    }

    const current = await prisma.grievance.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ success: false, error: 'Grievance not found' }, { status: 404 });
    }

    const updateData = {};
    const logDetails = [];

    // Track status transitions
    if (status && status !== current.status) {
      updateData.status = status;
      logDetails.push(`Status changed from '${current.status}' to '${status}'`);
    }

    // Track ownership transitions
    if (assignedToId && assignedToId !== current.assignedToId) {
      updateData.assignedToId = assignedToId;
      // Auto transition to ASSIGNED status if still in SUBMITTED state
      if (current.status === 'SUBMITTED') {
        updateData.status = 'ASSIGNED';
      }
      logDetails.push(`Responsibility assigned to technician/staff (ID: ${assignedToId})`);
    }

    if (logDetails.length === 0 && !note) {
      return NextResponse.json({ success: false, error: 'No changes provided' }, { status: 400 });
    }

    const updated = await prisma.grievance.update({
      where: { id },
      data: {
        ...updateData,
        auditLogs: {
          create: {
            action: status ? `STATUS_${status}` : 'REASSIGNED',
            performedBy: updatedById,
            details: logDetails.join('. ') + (note ? ` | Note: ${note}` : ''),
          },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Grievance updated successfully',
      data: {
        ...updated,
        slaStatus: getTicketSLAStatus(updated),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
