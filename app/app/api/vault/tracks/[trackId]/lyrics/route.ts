import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const session = await requireSession();
    const { trackId } = await params;
    const { lyrics } = await req.json();
    if (!lyrics) return NextResponse.json({ error: "lyrics required" }, { status: 400 });

    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: "No artist profile" }, { status: 404 });

    const track = await db.track.findUnique({ where: { id: trackId }, include: { release: true } });
    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
    if ((track.release as any).artistId !== artist.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    await db.track.update({ where: { id: trackId }, data: { lyrics } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
