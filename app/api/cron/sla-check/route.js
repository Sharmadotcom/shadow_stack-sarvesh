import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runSLAEscalationCheck } from '@/lib/slaEngine';

/**
 * GET /api/cron/sla-check
 * Evaluates active tickets against SLA deadlines. If breached, escalates level & logs breach.
 * Can be called by Vercel Cron, GitHub Actions, or local background timers.
 */
export async function GET(req) {
  try {
    const result = await runSLAEscalationCheck(prisma);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: result,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
