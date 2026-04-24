import { NextResponse } from "next/server";
import { createImportSession } from "../_lib/distrokid-import-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await createImportSession();

  return NextResponse.json({
    session_token: session.sessionToken,
    expires_at: session.expiresAt,
    status_url: `/api/import/distrokid/status/${encodeURIComponent(session.sessionToken)}`,
  });
}
