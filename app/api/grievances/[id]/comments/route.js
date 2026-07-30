import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/grievances/[id]/comments
 * Add progress updates / public notes to keep student informed or internal staff notes
 */
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { content, authorId, isInternal } = await req.json();

    if (!content || !authorId) {
      return NextResponse.json({ success: false, error: 'content and authorId are required' }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId,
        grievanceId: id,
        isInternal: Boolean(isInternal),
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    // Also record an entry in audit log for transparency
    await prisma.auditLog.create({
      data: {
        grievanceId: id,
        action: 'COMMENT_ADDED',
        performedBy: authorId,
        details: isInternal
          ? 'Internal staff note added.'
          : `Public update sent to student: "${content.substring(0, 50)}..."`,
      },
    });

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
