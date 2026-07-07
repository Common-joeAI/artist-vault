import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireSession();
    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ releases: [] });

    const releases = await db.release.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      include: {
        tracks: {
          select: {
            id: true,
            title: true,
            isrc: true,
            lyrics: true,
            enhancerStatus: true,
            enhancedAt: true,
            lastEnhancementError: true,
          },
          orderBy: { trackNumber: "asc" },
        },
      },
    });

    // Attach artistName + releaseTitle to each track for convenience
    const releasesWithMeta = releases.map(r => ({
      ...r,
      tracks: r.tracks.map(t => ({
        ...t,
        artistName: artist.name ?? "Unknown Artist",
        releaseTitle: r.title,
        releaseId: r.id,
        trackId: t.id,
      })),
    }));

    return NextResponse.json({ releases: releasesWithMeta });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
