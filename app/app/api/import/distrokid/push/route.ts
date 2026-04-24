import { NextRequest, NextResponse } from "next/server";
import {
  appendSessionErrors,
  getImportSession,
  markSessionCompleted,
  markSessionRunning,
  saveRawPayload,
} from "@/lib/server/distrokid-import-store";
import { persistImportedReleaseDrafts, sanitizeIncomingPayload } from "@/lib/server/distrokid-release-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalized = sanitizeIncomingPayload(body);

    const session = await getImportSession(normalized.sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Invalid import session token." }, { status: 404 });
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Import session expired." }, { status: 410 });
    }

    await markSessionRunning(session.sessionToken);
    const payloadFile = await saveRawPayload(session.sessionToken, body);
    const result = await persistImportedReleaseDrafts(session.sessionToken, normalized.releases);

    await markSessionCompleted(session.sessionToken, {
      payloadFile,
      releaseCount: result.releaseCount,
      importedFiles: result.importedFiles,
      errors: result.errors,
    });

    return NextResponse.json({
      ok: true,
      release_count: result.releaseCount,
      imported_files: result.importedFiles,
      errors: result.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import error.";
    const maybeToken = await tryReadToken(request);

    if (maybeToken) {
      await appendSessionErrors(maybeToken, [message]).catch(() => undefined);
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function tryReadToken(request: NextRequest): Promise<string | null> {
  try {
    const body = await request.clone().json();
    return typeof body?.session_token === "string" ? body.session_token : null;
  } catch {
    return null;
  }
}
