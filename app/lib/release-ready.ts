/**
 * release-ready.ts
 *
 * Manages "Release Ready" status for releases.
 * A release is "ready" when:
 *   1. At least one master file is uploaded to a track
 *   2. Cover art is uploaded
 *   3. PRO registration (ASCAP or BMI) is done for all tracks
 *
 * When a release goes ready, subscribed radio stations are notified.
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────
// Check & update release ready status
// ─────────────────────────────────────────────

export type ReleaseReadyCheck = {
  masterUploaded: boolean;
  coverArtUploaded: boolean;
  proRegistered: boolean;
  isReady: boolean;
  missingItems: string[];
};

export async function checkReleaseReadyStatus(releaseId: string): Promise<ReleaseReadyCheck> {
  const release = await db.release.findUnique({
    where: { id: releaseId },
    include: {
      tracks: {
        select: {
          masterFileUrl: true,
          proStatus: true,
          ascapStatus: true,
          bmiStatus: true,
        },
      },
    },
  });

  if (!release) throw new Error("Release not found.");

  const missingItems: string[] = [];

  // Check master file
  const masterUploaded = release.tracks.some((t) => Boolean(t.masterFileUrl));
  if (!masterUploaded) missingItems.push("Upload at least one master audio file");

  // Check cover art
  const coverArtUploaded = Boolean(release.coverArtUrl);
  if (!coverArtUploaded) missingItems.push("Upload cover art");

  // Check PRO registration — any track needs proStatus APPROVED
  // (or legacy ascapStatus/bmiStatus APPROVED)
  const proRegistered = release.tracks.length === 0
    ? false
    : release.tracks.every((t) => {
        const hasNewPro = t.proStatus === "APPROVED";
        const hasLegacyPro =
          t.ascapStatus === "APPROVED" || t.bmiStatus === "APPROVED";
        return hasNewPro || hasLegacyPro;
      });

  if (!proRegistered) {
    missingItems.push("Complete PRO registration (ASCAP or BMI) for all tracks");
  }

  const isReady = masterUploaded && coverArtUploaded && proRegistered;

  return { masterUploaded, coverArtUploaded, proRegistered, isReady, missingItems };
}

export async function updateReleaseReadyStatus(releaseId: string): Promise<boolean> {
  const check = await checkReleaseReadyStatus(releaseId);
  const wasReady = (await db.release.findUnique({
    where: { id: releaseId },
    select: { isReleaseReady: true },
  }))?.isReleaseReady ?? false;

  await db.release.update({
    where: { id: releaseId },
    data: {
      masterUploaded: check.masterUploaded,
      coverArtUploaded: check.coverArtUploaded,
      isReleaseReady: check.isReady,
    },
  });

  // If release just became ready, queue radio notifications
  if (check.isReady && !wasReady) {
    await queueRadioNotifications(releaseId);
  }

  return check.isReady;
}

// ─────────────────────────────────────────────
// Radio station notifications
// ─────────────────────────────────────────────

async function queueRadioNotifications(releaseId: string) {
  const release = await db.release.findUnique({
    where: { id: releaseId },
    include: { artist: { select: { genres: true } } },
  });

  if (!release) return;

  // Find all radio stations that want notifications
  const stations = await db.radioStation.findMany({
    where: { notifyOnRelease: true },
  });

  if (stations.length === 0) return;

  // Filter by genre if the station has preferences
  const artistGenres = release.artist.genres
    ? release.artist.genres.toLowerCase().split(",").map((g) => g.trim())
    : [];

  const matchingStations = stations.filter((station) => {
    if (!station.genrePreferences) return true; // No filter = all releases
    const stationGenres = station.genrePreferences.toLowerCase().split(",").map((g) => g.trim());
    return artistGenres.some((g) => stationGenres.includes(g));
  });

  if (matchingStations.length === 0) return;

  // Create notification records (will be picked up by email sender)
  await db.radioNotification.createMany({
    data: matchingStations.map((station) => ({
      radioStationId: station.id,
      releaseId,
      status: "pending",
    })),
    skipDuplicates: true,
  });
}

// ─────────────────────────────────────────────
// Process pending notifications (called by cron or webhook)
// ─────────────────────────────────────────────

export async function processPendingRadioNotifications() {
  const pending = await db.radioNotification.findMany({
    where: { status: "pending" },
    include: {
      radioStation: true,
      release: {
        include: {
          artist: true,
          tracks: { select: { title: true, isrc: true, durationSeconds: true } },
        },
      },
    },
    take: 50,
  });

  for (const notification of pending) {
    try {
      await sendRadioNotificationEmail(notification);

      await db.radioNotification.update({
        where: { id: notification.id },
        data: { status: "sent", sentAt: new Date() },
      });
    } catch (error) {
      await db.radioNotification.update({
        where: { id: notification.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  return pending.length;
}

async function sendRadioNotificationEmail(notification: {
  radioStation: { contactEmail: string | null; stationName: string };
  release: {
    title: string;
    coverArtUrl: string | null;
    releaseDate: Date | null;
    artist: { name: string };
    tracks: Array<{ title: string; isrc: string | null; durationSeconds: number | null }>;
  };
}) {
  const { radioStation, release } = notification;

  if (!radioStation.contactEmail) {
    throw new Error("Radio station has no contact email.");
  }

  const emailApiKey = process.env.SENDGRID_API_KEY ?? process.env.RESEND_API_KEY;

  if (!emailApiKey) {
    throw new Error("No email provider configured (set SENDGRID_API_KEY or RESEND_API_KEY).");
  }

  const trackList = release.tracks
    .map((t, i) => {
      const dur = t.durationSeconds
        ? `${Math.floor(t.durationSeconds / 60)}:${String(t.durationSeconds % 60).padStart(2, "0")}`
        : "—";
      return `${i + 1}. ${t.title} (${dur})${t.isrc ? ` — ISRC: ${t.isrc}` : ""}`;
    })
    .join("\n");

  const subject = `New Release Ready for Radio: "${release.title}" by ${release.artist.name}`;

  const body = `Hello ${radioStation.stationName},

A new release is ready for radio play on AI Artist Vault:

Artist: ${release.artist.name}
Title: ${release.title}
Release Date: ${release.releaseDate?.toISOString().slice(0, 10) ?? "TBD"}
${release.coverArtUrl ? `Cover Art: ${release.coverArtUrl}` : ""}

Tracks:
${trackList}

This release has been verified: master files uploaded, cover art complete, and PRO registration finalized.

Visit aiartistvault.com to access the full press kit and download materials.

—
AI Artist Vault
aiartistvault.com`;

  // Use Resend if available, fall back to SendGrid
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "noreply@aiartistvault.com",
        to: radioStation.contactEmail,
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }
  } else if (process.env.SENDGRID_API_KEY) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: radioStation.contactEmail }] }],
        from: { email: process.env.EMAIL_FROM ?? "noreply@aiartistvault.com" },
        subject,
        content: [{ type: "text/plain", value: body }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SendGrid error: ${err}`);
    }
  }
}
