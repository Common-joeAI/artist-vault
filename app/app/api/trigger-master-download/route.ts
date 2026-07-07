import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;

  // Fire-and-forget: trigger master download for this user
  execFile("python3", [
    "/opt/containers/artist-vault/scripts/trigger_master_download.py",
    userId,
  ], (err) => {
    if (err) console.error("[master-trigger] error:", err.message);
  });

  return NextResponse.json({ ok: true, message: "Master download started in background" });
}
