import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";

const createCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  defaultPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  slaAckHours: z.number().int().positive(),
  slaResolveHours: z.number().int().positive(),
  isRestricted: z.boolean().default(false),
});

// GET /api/admin/categories — List all categories
async function getHandler(
  _req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  _user: JwtPayload
): Promise<NextResponse> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { tickets: true, team: true } },
      },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (err) {
    console.error("[GET /api/admin/categories]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/categories — Create new category (SUPER_ADMIN only)
async function postHandler(
  req: NextRequest,
  _ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Only Super Admin can create categories" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({ data: parsed.data });

    return NextResponse.json(
      { success: true, message: "Category created", data: category },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Category name or slug already exists" },
        { status: 409 }
      );
    }
    console.error("[POST /api/admin/categories]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, "STAFF");
export const POST = withAuth(postHandler, "SUPER_ADMIN");
