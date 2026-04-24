import { NextResponse } from "next/server";
import { getImportSession } from "../../_lib/distrokid-import-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: {
    sessionToken: string;
  };
};

export async function GET(_request: Request, context: Context) {
  const { sessionToken } = context.params;
  const session = await getImportSession(sessionToken);

  if (!session) {
    return NextResponse.json({ error: "Import session not found." }, { status: 404 });
  }

  return NextResponse.json({
    session_token: session.sessionToken,
    status: session.status,
    release_count: session.releaseCount,
    imported_files: session.importedFiles,
    payload_file: session.payloadFile,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
    completed_at: session.completedAt,
    errors: session.errors,
  });
}
