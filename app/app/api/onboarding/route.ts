import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const onboardingSchema = z.object({
  name: z.string().trim().min(1, "Artist name is required."),
  bio: z.string().trim().optional().default(""),
  photoUrl: z.string().trim().url("Photo URL must be valid.").or(z.literal("")),
  spotifyUrl: z.string().trim().url("Spotify URL must be valid.").or(z.literal("")),
  appleMusicUrl: z.string().trim().url("Apple Music URL must be valid.").or(z.literal("")),
  youtubeMusicUrl: z.string().trim().url("YouTube URL must be valid.").or(z.literal("")),
  websiteUrl: z.string().trim().url("Website URL must be valid.").or(z.literal("")),
  otherUrl: z.string().trim().url("Other URL must be valid.").or(z.literal("")),
  proOrg: z.enum(["ASCAP", "BMI", "SESAC", ""]).optional().transform(v => v === "" ? undefined : v),
  proMemberId: z.string().trim().optional(),
  producerIpiNumber: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const data = onboardingSchema.parse(rawBody);

    const existing = await db.artistProfile.findFirst({
      where: session.userId ? { ownerUserId: session.userId } : undefined,
      orderBy: { createdAt: "asc" },
    });

    const links = [
      data.spotifyUrl ? { platform: "spotify", url: data.spotifyUrl, label: "Spotify" } : null,
      data.appleMusicUrl ? { platform: "apple_music", url: data.appleMusicUrl, label: "Apple Music" } : null,
      data.youtubeMusicUrl ? { platform: "youtube_music", url: data.youtubeMusicUrl, label: "YouTube Music" } : null,
      data.websiteUrl ? { platform: "website", url: data.websiteUrl, label: "Website" } : null,
      data.otherUrl ? { platform: "other", url: data.otherUrl, label: "Other" } : null,
    ].filter(Boolean) as { platform: string; url: string; label: string }[];

    if (existing) {
      await db.artistProfile.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          bio: data.bio || null,
          photoUrl: data.photoUrl || null,
        },
      });

      await db.artistLink.deleteMany({ where: { artistId: existing.id } });

      if (links.length) {
        await db.artistLink.createMany({
          data: links.map(link => ({
            artistId: existing.id,
            platform: link.platform,
            label: link.label,
            url: link.url,
          })),
        });
      }
    } else {
      const created = await db.artistProfile.create({
        data: {
          name: data.name,
          bio: data.bio || null,
          photoUrl: data.photoUrl || null,
          ...(session.userId ? { ownerUser: { connect: { id: session.userId } } } : {}),
        },
      });

      if (links.length) {
        await db.artistLink.createMany({
          data: links.map((link: { platform: string; url: string; label: string }) => ({
            artistId: created.id,
            platform: link.platform,
            label: link.label,
            url: link.url,
          })),
        });
      }
    }

    // Save PRO fields to the User record (that's where the schema defines them)
    if (session.userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userDb = db.user as any;
      await userDb.update({
        where: { id: session.userId },
        data: {
          ...(data.proOrg ? { proOrg: data.proOrg } : {}),
          ...(data.proMemberId ? { proMemberId: data.proMemberId } : {}),
          ...(data.producerIpiNumber ? { producerIpiNumber: data.producerIpiNumber } : {}),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation failed." }, { status: 400 });
    }
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Unable to save onboarding data." }, { status: 500 });
  }
}