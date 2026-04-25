import { NextResponse } from "next/server";
import { createImportSession } from "@/lib/server/import-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await createImportSession("soundon");

    return NextResponse.json({
      ok: true,
      sessionToken: session.sessionToken,
      session_token: session.sessionToken,
      token: session.sessionToken,
      expiresAt: session.expiresAt.toISOString(),
      expires_at: session.expiresAt.toISOString(),
      status: session.status,
      status_url: `/api/import/soundon/status/${encodeURIComponent(session.sessionToken)}`,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create session." },
      { status: 500 }
    );
  }
}
