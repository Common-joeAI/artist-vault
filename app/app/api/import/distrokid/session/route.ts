import { NextResponse } from "next/server";
import { createImportSession } from "@/lib/server/distrokid-import-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await createImportSession();
  const token = session.sessionToken;

  return NextResponse.json({
    ok: true,
    sessionToken: session.sessionToken,
    session_token: session.sessionToken,
    token,
    activeToken: token,
    importToken: token,
    import_token: token,
    expiresAt: session.expiresAt,
    expires_at: session.expiresAt,
    status: session.status,
    status_url: `/api/import/distrokid/status/${encodeURIComponent(session.sessionToken)}`,
  });
}
