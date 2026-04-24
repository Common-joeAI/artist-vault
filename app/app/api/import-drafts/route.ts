import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";

type DraftRelease = {
  title: string;
  inferredType: "SINGLE" | "EP" | "ALBUM";
  sourceUrl: string;
  platform: string;
};

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { releases?: DraftRelease[] };
    const releases = body.releases ?? [];

    if (!releases.length) {
      return NextResponse.json({ error: "No releases provided." }, { status: 400 });
    }

    const artist = await getPrimaryArtistProfile();

    if (!artist) {
      return NextResponse.json({ error: "Run onboarding first so the vault has an artist profile." }, { status: 400 });
    }

    const existing = await db.release.findMany({
      where: { artistId: artist.id },
      select: { title: true },
    });

    const existingTitles = new Set(existing.map((release) => release.title.trim().toLowerCase()));
    const created: string[] = [];
    const skipped: string[] = [];

    for (const release of releases) {
      const normalizedTitle = release.title.trim();
      const key = normalizedTitle.toLowerCase();

      if (!normalizedTitle || existingTitles.has(key)) {
        skipped.push(normalizedTitle || "Untitled release");
        continue;
      }

      await db.release.create({
        data: {
          artistId: artist.id,
          title: normalizedTitle,
          releaseType: release.inferredType,
          notes: `Imported draft from ${release.platform} source: ${release.sourceUrl}`,
          spotifyUrl: release.platform === "spotify" ? release.sourceUrl : null,
          appleMusicUrl: release.platform === "apple_music" ? release.sourceUrl : null,
          youtubeMusicUrl: release.platform === "youtube" ? release.sourceUrl : null,
          ...(release.inferredType === "SINGLE"
            ? {
                tracks: {
                  create: [
                    {
                      title: normalizedTitle,
                      trackNumber: 1,
                    },
                  ],
                },
              }
            : {}),
        },
      });

      existingTitles.add(key);
      created.push(normalizedTitle);
    }

    return NextResponse.json({ created, skipped });
  } catch {
    return NextResponse.json({ error: "Unable to create imported drafts." }, { status: 500 });
  }
}
