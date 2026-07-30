import { NextResponse } from "next/server";

// GET /api/health — Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ok",
    service: "Campus Grievance Redressal API",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
}
