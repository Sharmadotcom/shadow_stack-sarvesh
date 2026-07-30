import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSLADeadline, getTicketSLAStatus } from '@/lib/slaEngine';

/**
 * GET /api/grievances
 * Fetch complaints with optional filters (status, category, priority, studentId, staffId)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const createdById = searchParams.get('createdById');
    const assignedToId = searchParams.get('assignedToId');

    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (createdById) where.createdById = createdById;
    if (assignedToId) where.assignedToId = assignedToId;

    const grievances = await prisma.grievance.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        attachments: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach computed SLA status to each complaint
    const formatted = grievances.map((item) => ({
      ...item,
      slaStatus: getTicketSLAStatus(item),
    }));

    return NextResponse.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/grievances
 * Submit a new grievance/complaint with SLA countdown & department routing
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { title, description, category, priority, location, createdById, attachments } = body;

    if (!title || !description || !category || !location || !createdById) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, description, category, location, createdById' },
        { status: 400 }
      );
    }

    // 1. Calculate SLA target deadline
    const ticketPriority = priority || 'MEDIUM';
    const { slaHours, slaDeadline } = calculateSLADeadline(ticketPriority);

    // 2. Generate unique Ticket Number (e.g. GRV-2026-0001)
    const count = await prisma.grievance.count();
    const ticketNumber = `GRV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    // 3. Create ticket in Database with SLA & initial Audit Log
    const grievance = await prisma.grievance.create({
      data: {
        ticketNumber,
        title,
        description,
        category,
        priority: ticketPriority,
        location,
        department: category, // Auto-assign target department
        createdById,
        slaHours,
        slaDeadline,
        attachments: {
          create: attachments?.map((att) => ({
            url: att.url,
            fileName: att.fileName || 'Attachment',
            fileType: att.fileType || 'image',
          })) || [],
        },
        auditLogs: {
          create: {
            action: 'CREATED',
            performedBy: createdById,
            details: `Grievance logged under ${category} (${ticketPriority} priority). SLA timer initialized: ${slaHours}h deadline.`,
          },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        attachments: true,
        auditLogs: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Grievance submitted successfully',
        data: {
          ...grievance,
          slaStatus: getTicketSLAStatus(grievance),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
