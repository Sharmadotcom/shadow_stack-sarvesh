import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { JwtPayload } from "@/lib/jwt";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "public/uploads";
const MAX_FILES = 3;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

// POST /api/tickets/[id]/attachments — Upload attachments
async function handler(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  user: JwtPayload
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const ticketId = parseInt(id, 10);

    if (isNaN(ticketId)) {
      return NextResponse.json(
        { success: false, message: "Invalid ticket ID" },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Only the student who raised it or assigned staff can upload
    if (
      user.role === "STUDENT" &&
      ticket.studentId !== user.id
    ) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    // Check existing attachment count
    const existingCount = await prisma.ticketAttachment.count({
      where: { ticketId },
    });

    const formData = await req.formData();
    const files = formData.getAll("attachments") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: "No files provided" },
        { status: 400 }
      );
    }

    if (existingCount + files.length > MAX_FILES) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximum ${MAX_FILES} attachments allowed per ticket`,
        },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const saved: { filePath: string; fileName: string; mimeType: string }[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, message: `File type not allowed: ${file.type}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, message: `File too large: ${file.name} (max 5 MB)` },
          { status: 400 }
        );
      }

      const ext = path.extname(file.name);
      const uniqueName = `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const filePath = path.join(UPLOAD_DIR, uniqueName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      saved.push({ filePath, fileName: file.name, mimeType: file.type });
    }

    // Save attachment records in DB
    const attachments = await prisma.$transaction(
      saved.map((s) =>
        prisma.ticketAttachment.create({
          data: {
            ticketId,
            filePath: s.filePath,
            fileName: s.fileName,
            mimeType: s.mimeType,
          },
        })
      )
    );

    // Log to timeline
    await prisma.ticketTimeline.create({
      data: {
        ticketId,
        actorId: user.id,
        action: "ATTACHMENT_ADDED",
        note: `${files.length} attachment(s) uploaded`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${attachments.length} file(s) uploaded successfully`,
        data: attachments,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/tickets/[id]/attachments]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, "STUDENT");
