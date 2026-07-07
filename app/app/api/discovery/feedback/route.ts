import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { jobId, platform, url, title, artist, artistProfileId, verdict } = body;

    if (!verdict || !["mine", "not_mine"].includes(verdict)) {
      return NextResponse.json({ error: "Invalid verdict" }, { status: 400 });
    }

    const recordId = `${session.userId}_${Buffer.from(url).toString("base64").slice(0, 40)}`;

    // Upsert feedback — overwrite if they change their mind
    await db.discoveryFeedback.upsert({
      where: { id: recordId },
      update: { verdict },
      create: {
        id: recordId,
        ownerUserId: session.userId,
        artistProfileId: artistProfileId ?? null,
        jobId: jobId ?? null,
        platform,
        url,
        title,
        artist,
        verdict,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[discovery/feedback]", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await requireSession();
    const feedbacks = await db.discoveryFeedback.findMany({
      where: { ownerUserId: session.userId },
      select: { url: true, verdict: true },
    });
    const map: Record<string, string> = {};
    for (const f of feedbacks) map[f.url] = f.verdict;
    return NextResponse.json({ verdicts: map });
  } catch {
    return NextResponse.json({ verdicts: {} });
  }
}
