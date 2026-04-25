import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { discoverCatalogWithClaude } from "@/lib/claude-catalog-discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const discoveryRequestSchema = z.object({
  artistName: z.string().trim().optional().nullable(),
  urls: z.array(z.string().trim().url()).max(8).default([]),
  currentProfile: z.unknown().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let jobId: string | null = null;

  try {
    const body = discoveryRequestSchema.parse(await request.json());
    const urls = Array.from(new Set(body.urls.filter(Boolean)));

    if (!urls.length) {
      return NextResponse.json({ error: "Add at least one public artist or release URL first." }, { status: 400 });
    }

    const profile = await getPrimaryArtistProfile();

    const job = await db.onboardingDiscoveryJob.create({
      data: {
        ownerUserId: session.userId ?? null,
        artistProfileId: profile?.id ?? null,
        status: "processing",
        startedAt: new Date(),
        requestedUrlsJson: { urls, artistName: body.artistName ?? null } as any,
      },
    });

    jobId = job.id;

    const result = await discoverCatalogWithClaude({
      artistName: body.artistName ?? profile?.name ?? null,
      urls,
      existing: {
        currentProfile: body.currentProfile ?? null,
        vaultProfile: profile
          ? {
              id: profile.id,
              name: profile.name,
              bio: profile.bio,
              photoUrl: profile.photoUrl,
              links: profile.links.map((link) => ({ platform: link.platform, label: link.label, url: link.url })),
              releases: profile.releases.map((release) => ({
                id: release.id,
                title: release.title,
                releaseType: release.releaseType,
                releaseDate: release.releaseDate,
                spotifyUrl: release.spotifyUrl,
                appleMusicUrl: release.appleMusicUrl,
                youtubeMusicUrl: release.youtubeMusicUrl,
                tracks: release.tracks.map((track) => ({ id: track.id, title: track.title, isrc: track.isrc })),
              })),
            }
          : null,
      },
    });

    await db.onboardingDiscoveryJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        aiModel: result.model,
        snapshotJson: result.snapshots as any,
        resultJson: result.discovery as any,
      },
    });

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      discovery: result.discovery,
      snapshots: result.snapshots,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to discover catalog metadata.";

    if (jobId) {
      await db.onboardingDiscoveryJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          failedAt: new Date(),
          errorJson: { message } as any,
        },
      }).catch(() => undefined);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation failed." }, { status: 400 });
    }

    console.error("onboarding discovery error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
