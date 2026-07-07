import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Returns all tracks in the vault for the current user, grouped by release
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profiles = await db.artistProfile.findMany({
    where: { ownerUserId: session.userId },
    select: { id: true, name: true },
  });

  const profileIds = profiles.map(p => p.id);

  const releases = await db.release.findMany({
    where: { artistId: { in: profileIds } },
    include: {
      tracks: { select: { id: true, title: true, isrc: true, enhancerStatus: true, enhancedAt: true } },
      artist: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const tracks = releases.flatMap(r =>
    r.tracks.map(t => ({
      trackId: t.id,
      trackTitle: t.title,
      releaseId: r.id,
      releaseTitle: r.title,
      artistName: r.artist.name,
      isrc: t.isrc,
      enhancerStatus: t.enhancerStatus,
      enhancedAt: t.enhancedAt,
    }))
  );

  return NextResponse.json({ tracks, total: tracks.length });
}
