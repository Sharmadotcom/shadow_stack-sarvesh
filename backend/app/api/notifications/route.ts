import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";

// GET /api/notifications — In-app notifications for current user
async function getHandler(
  req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: { userId: number; isRead?: boolean } = { userId: user.id };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications — Mark all notifications as read
async function patchHandler(
  req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: number[] | undefined = body?.ids;

    const where: { userId: number; id?: { in: number[] } } = { userId: user.id };
    if (ids && ids.length > 0) where.id = { in: ids };

    await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, "STUDENT");
export const PATCH = withAuth(patchHandler, "STUDENT");
