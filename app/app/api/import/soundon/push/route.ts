import { NextRequest, NextResponse } from "next/server";
import {
  sanitizeSoundOnPayload,
  persistSoundOnReleases,
} from "@/lib/server/soundon-release-adapter";
import {
  getImportSession,
  markSessionRunning,
  markSessionCompleted,
  markSessionFailed,
} from "@/lib/server/import-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let sessionToken: string | null = null;

  try {
    const body = await req.json();
    const { sessionToken: token, releases } = sanitizeSoundOnPayload(body);
    sessionToken = token;

    const session = await getImportSession(token);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Import session not found or expired." },
        { status: 404 }
      );
    }

    if (session.status === "running") {
      return NextResponse.json(
        { ok: false, error: "Import already in progress for this session." },
        { status: 409 }
      );
    }

    await markSessionRunning(token);

    const result = await persistSoundOnReleases(token, releases);

    await markSessionCompleted(token, {
      releaseCount: result.releaseCount,
      importedReleaseIds: result.importedReleaseIds,
      rawPayload: body,
      errors: result.errors,
    });

    return NextResponse.json({
      ok: true,
      releaseCount: result.releaseCount,
      importedReleaseIds: result.importedReleaseIds,
      errors: result.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";

    if (sessionToken) {
      await markSessionFailed(sessionToken, [message]).catch(() => {});
    }

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
