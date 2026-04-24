import { NextResponse } from "next/server";
import { getImportSession } from "@/lib/server/distrokid-import-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionToken: string }> }
) {
  const { sessionToken } = await params;
  const session = await getImportSession(sessionToken);

  if (!session) {
    return NextResponse.json({ error: "Import session not found." }, { status: 404 });
  }

  const token = session.sessionToken;

  return NextResponse.json({
    ok: true,
    sessionToken: session.sessionToken,
    session_token: session.sessionToken,
    token,
    activeToken: token,
    importToken: token,
    import_token: token,
    status: session.status,
    releaseCount: session.releaseCount ?? 0,
    release_count: session.releaseCount ?? 0,
    expiresAt: session.expiresAt,
    expires_at: session.expiresAt,
  });
}
