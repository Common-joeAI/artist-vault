import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { createPressKitPdf } from "@/lib/simple-pdf";
import nodemailer from "nodemailer";

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value as string) as T; } catch { return fallback; }
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const artist = await getPrimaryArtistProfile();
  if (!artist) return NextResponse.json({ error: "No artist profile" }, { status: 400 });

  const pressKit = artist.pressKits?.[0];
  if (!pressKit) return NextResponse.json({ error: "Save a press kit first" }, { status: 400 });

  // Determine featured releases
  const featuredIds: string[] = parseJsonField(pressKit.featuredTrackIds, []);
  const releases = featuredIds.length
    ? artist.releases.filter((r) => featuredIds.includes(r.id))
    : artist.releases.slice(0, 5);

  // Build full release data for PDF
  const releaseData = await Promise.all(
    releases.map(async (r) => {
      const full = await db.release.findUnique({
        where: { id: r.id },
        include: { tracks: { orderBy: { trackNumber: "asc" } } },
      });
      return full!;
    })
  );

  const pdf = createPressKitPdf({
    artistName: artist.name,
    title: pressKit.title ?? "",
    shortBio: pressKit.shortBio ?? "",
    longBio: pressKit.longBio ?? "",
    websiteUrl: pressKit.websiteUrl ?? "",
    contactEmail: pressKit.contactEmail ?? "",
    links: artist.links.map((l) => `${l.label ?? l.platform}: ${l.url}`),
    releases: releaseData.map((r) => ({
      title: r.title,
      releaseType: r.releaseType,
      releaseDate: r.releaseDate?.toISOString().split("T")[0] ?? null,
      coverArtUrl: r.coverArtUrl ?? null,
      spotifyUrl: r.spotifyUrl ?? null,
      appleMusicUrl: r.appleMusicUrl ?? null,
      isReleaseReady: r.isReleaseReady,
      tracks: r.tracks.map((t) => ({
        title: t.title,
        isrc: t.isrc ?? null,
        durationSeconds: t.durationSeconds ?? null,
        bpm: t.bpm ?? null,
        proStatus: t.proStatus,
      })),
    })),
  });

  // Find matching radio stations
  const artistGenres: string[] = parseJsonField(
    await db.artistProfile.findUnique({ where: { id: artist.id }, select: { genres: true } }).then((a) => a?.genres),
    []
  );

  const stations = await db.radioStation.findMany({
    where: { notifyOnRelease: true, contactEmail: { not: null } },
  });

  const matchingStations = stations.filter((s) => {
    if (!s.contactEmail) return false;
    const stationGenres: string[] = parseJsonField(s.genrePreferences, []);
    if (!stationGenres.length || !artistGenres.length) return true; // no filter = include all
    return stationGenres.some((g) => artistGenres.some((ag) => ag.toLowerCase() === g.toLowerCase()));
  });

  if (!matchingStations.length) {
    return NextResponse.json({ sent: 0, message: "No matching radio stations with notifications enabled." });
  }

  // Email transport  -  configure SMTP or Resend
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM ?? process.env.ARTIST_VAULT_ADMIN_EMAIL ?? "noreply@aiartistvault.com";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json({
      error: "SMTP not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to your .env file.",
      stationsFound: matchingStations.length,
    }, { status: 503 });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: smtpUser, pass: smtpPass },
  });

  const artistSlug = artist.releases[0]
    ? (artist.name ?? "artist").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : "artist";

  let sent = 0;
  const errors: string[] = [];

  for (const station of matchingStations) {
    try {
      await transporter.sendMail({
        from: `${artist.name} via AI Artist Vault <${smtpFrom}>`,
        to: station.contactEmail!,
        subject: `New Release Submission  -  ${artist.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
            <h2 style="color:#7c3aed;">New Music Submission</h2>
            <p>Hi ${station.contactName ?? station.stationName},</p>
            <p><strong>${artist.name}</strong> has submitted a press kit for your consideration via <a href="https://aiartistvault.com">AI Artist Vault</a>.</p>
            <p>${pressKit.shortBio ?? "An independent AI music artist looking for radio play."}</p>
            <p>The full press kit is attached as a PDF. You can also view the online press kit here:<br>
            <a href="https://aiartistvault.com/presskit/${(pressKit as any).slug}">${pressKit.title}</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:1.5rem 0;">
            <p style="color:#888;font-size:0.85rem;">
              You are receiving this because your station is subscribed to release notifications on AI Artist Vault.
              <br><a href="https://aiartistvault.com/radio/settings">Manage notification preferences</a>
            </p>
          </div>
        `,
        attachments: [{
          filename: `${artistSlug}-press-kit.pdf`,
          content: pdf,
          contentType: "application/pdf",
        }],
      });
      sent++;

      // Log the notification
      await db.radioNotification.create({
        data: {
          radioStationId: station.id,
          releaseId: releaseData[0]?.id ?? "",
          sentAt: new Date(),
        },
      }).catch(() => {}); // non-fatal
    } catch (err: any) {
      errors.push(`${station.stationName}: ${err.message}`);
    }
  }

  return NextResponse.json({ sent, total: matchingStations.length, errors });
}
