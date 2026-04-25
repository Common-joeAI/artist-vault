import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { runExternalDiscovery } from "@/lib/ai-discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { artistProfileId } = await req.json();

  if (!artistProfileId) {
    return NextResponse.json({ error: "Missing artistProfileId." }, { status: 400 });
  }

  // Make sure this profile belongs to the requesting user
  const profile = await db.artistProfile.findFirst({
    where: { id: artistProfileId, ownerUserId: session.userId },
    select: { id: true, name: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Artist profile not found." }, { status: 404 });
  }

  try {
    const result = await runExternalDiscovery(
      profile.id,
      profile.name,
      session.userId,
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed." },
      { status: 500 }
    );
  }
}
