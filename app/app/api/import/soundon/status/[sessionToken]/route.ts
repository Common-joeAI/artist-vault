import { NextRequest, NextResponse } from "next/server";
import { getImportSession } from "@/lib/server/import-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionToken: string }> }
) {
  const { sessionToken } = await params;

  const session = await getImportSession(sessionToken);

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Session not found or expired." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    sessionToken: session.sessionToken,
    provider: session.provider,
    status: session.status,
    releaseCount: session.releaseCount,
    importedReleaseIds: session.importedReleaseIds ?? [],
    errors: session.errors ?? [],
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
  });
}
