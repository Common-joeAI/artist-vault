"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile, getReleaseById } from "@/lib/artist-vault";

const releaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  releaseType: z.enum(["SINGLE", "EP", "ALBUM"]),
  distributor: z.string().trim().optional().nullable(),
  releaseDate: z.string().trim().optional().nullable(),
  coverArtUrl: z.string().trim().url("Cover art URL must be valid.").or(z.literal("")).optional(),
  spotifyUrl: z.string().trim().url("Spotify URL must be valid.").or(z.literal("")).optional(),
  appleMusicUrl: z.string().trim().url("Apple Music URL must be valid.").or(z.literal("")).optional(),
  youtubeMusicUrl: z.string().trim().url("YouTube Music URL must be valid.").or(z.literal("")).optional(),
  notes: z.string().trim().optional().nullable(),
});

const trackSchema = z.object({
  title: z.string().trim().min(1, "Track title is required."),
  trackNumber: z.coerce.number().int().positive().optional().nullable(),
  isrc: z.string().trim().optional().nullable(),
  lyrics: z.string().trim().optional().nullable(),
  masterFileUrl: z.string().trim().url("Master file URL must be valid.").or(z.literal("")).optional(),
  audioPreviewUrl: z.string().trim().url("Audio preview URL must be valid.").or(z.literal("")).optional(),
  durationSeconds: z.coerce.number().int().positive().optional().nullable(),
  bpm: z.coerce.number().int().positive().optional().nullable(),
  explicit: z.boolean().default(false),
  ascapStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "APPROVED"]),
  bmiStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "APPROVED"]),
  ascapWorkId: z.string().trim().optional().nullable(),
  bmiWorkId: z.string().trim().optional().nullable(),
  writers: z.string().trim().optional().nullable(),
  producers: z.string().trim().optional().nullable(),
  splitNotes: z.string().trim().optional().nullable(),
});

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function getOptionalNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getOptionalDate(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createReleaseAction(formData: FormData) {
  await requireSession();
  const artist = await getPrimaryArtistProfile();

  if (!artist) {
    redirect("/vault/onboarding");
  }

  const parsed = releaseSchema.parse({
    title: getString(formData, "title"),
    releaseType: getString(formData, "releaseType"),
    distributor: getOptionalString(formData, "distributor"),
    releaseDate: getOptionalString(formData, "releaseDate") ?? "",
    coverArtUrl: getString(formData, "coverArtUrl"),
    spotifyUrl: getString(formData, "spotifyUrl"),
    appleMusicUrl: getString(formData, "appleMusicUrl"),
    youtubeMusicUrl: getString(formData, "youtubeMusicUrl"),
    notes: getOptionalString(formData, "notes"),
  });

  const release = await db.release.create({
    data: {
      artistId: artist.id,
      title: parsed.title,
      releaseType: parsed.releaseType,
      distributor: parsed.distributor,
      releaseDate: getOptionalDate(formData, "releaseDate"),
      coverArtUrl: parsed.coverArtUrl || null,
      spotifyUrl: parsed.spotifyUrl || null,
      appleMusicUrl: parsed.appleMusicUrl || null,
      youtubeMusicUrl: parsed.youtubeMusicUrl || null,
      notes: parsed.notes,
    },
  });

  redirect(`/vault/releases/${release.id}`);
}

export async function updateReleaseAction(releaseId: string, formData: FormData) {
  await requireSession();

  const release = await getReleaseById(releaseId);
  if (!release) {
    redirect("/vault/releases");
  }

  const parsed = releaseSchema.parse({
    title: getString(formData, "title"),
    releaseType: getString(formData, "releaseType"),
    distributor: getOptionalString(formData, "distributor"),
    releaseDate: getOptionalString(formData, "releaseDate") ?? "",
    coverArtUrl: getString(formData, "coverArtUrl"),
    spotifyUrl: getString(formData, "spotifyUrl"),
    appleMusicUrl: getString(formData, "appleMusicUrl"),
    youtubeMusicUrl: getString(formData, "youtubeMusicUrl"),
    notes: getOptionalString(formData, "notes"),
  });

  await db.release.update({
    where: { id: releaseId },
    data: {
      title: parsed.title,
      releaseType: parsed.releaseType,
      distributor: parsed.distributor,
      releaseDate: getOptionalDate(formData, "releaseDate"),
      coverArtUrl: parsed.coverArtUrl || null,
      spotifyUrl: parsed.spotifyUrl || null,
      appleMusicUrl: parsed.appleMusicUrl || null,
      youtubeMusicUrl: parsed.youtubeMusicUrl || null,
      notes: parsed.notes,
    },
  });

  redirect(`/vault/releases/${releaseId}`);
}

export async function deleteReleaseAction(formData: FormData) {
  await requireSession();
  const releaseId = getString(formData, "releaseId");

  if (!releaseId) {
    redirect("/vault/releases");
  }

  const release = await getReleaseById(releaseId);
  if (!release) {
    redirect("/vault/releases");
  }

  await db.release.delete({
    where: { id: releaseId },
  });

  redirect("/vault/releases");
}

export async function createTrackAction(releaseId: string, formData: FormData) {
  await requireSession();

  const release = await getReleaseById(releaseId);
  if (!release) {
    redirect("/vault/releases");
  }

  const parsed = trackSchema.parse({
    title: getString(formData, "title"),
    trackNumber: getOptionalNumber(formData, "trackNumber"),
    isrc: getOptionalString(formData, "isrc"),
    lyrics: getOptionalString(formData, "lyrics"),
    masterFileUrl: getString(formData, "masterFileUrl"),
    audioPreviewUrl: getString(formData, "audioPreviewUrl"),
    durationSeconds: getOptionalNumber(formData, "durationSeconds"),
    bpm: getOptionalNumber(formData, "bpm"),
    explicit: formData.get("explicit") === "on",
    ascapStatus: getString(formData, "ascapStatus"),
    bmiStatus: getString(formData, "bmiStatus"),
    ascapWorkId: getOptionalString(formData, "ascapWorkId"),
    bmiWorkId: getOptionalString(formData, "bmiWorkId"),
    writers: getOptionalString(formData, "writers"),
    producers: getOptionalString(formData, "producers"),
    splitNotes: getOptionalString(formData, "splitNotes"),
  });

  await db.track.create({
    data: {
      releaseId,
      title: parsed.title,
      trackNumber: parsed.trackNumber,
      isrc: parsed.isrc,
      lyrics: parsed.lyrics,
      masterFileUrl: parsed.masterFileUrl || null,
      audioPreviewUrl: parsed.audioPreviewUrl || null,
      durationSeconds: parsed.durationSeconds,
      bpm: parsed.bpm,
      explicit: parsed.explicit,
      ascapStatus: parsed.ascapStatus,
      bmiStatus: parsed.bmiStatus,
      ascapWorkId: parsed.ascapWorkId,
      bmiWorkId: parsed.bmiWorkId,
      writers: parsed.writers,
      producers: parsed.producers,
      splitNotes: parsed.splitNotes,
    },
  });

  redirect(`/vault/releases/${releaseId}`);
}

export async function updateTrackAction(releaseId: string, trackId: string, formData: FormData) {
  await requireSession();

  const release = await getReleaseById(releaseId);
  if (!release || !release.tracks.some((track) => track.id === trackId)) {
    redirect("/vault/releases");
  }

  const parsed = trackSchema.parse({
    title: getString(formData, "title"),
    trackNumber: getOptionalNumber(formData, "trackNumber"),
    isrc: getOptionalString(formData, "isrc"),
    lyrics: getOptionalString(formData, "lyrics"),
    masterFileUrl: getString(formData, "masterFileUrl"),
    audioPreviewUrl: getString(formData, "audioPreviewUrl"),
    durationSeconds: getOptionalNumber(formData, "durationSeconds"),
    bpm: getOptionalNumber(formData, "bpm"),
    explicit: formData.get("explicit") === "on",
    ascapStatus: getString(formData, "ascapStatus"),
    bmiStatus: getString(formData, "bmiStatus"),
    ascapWorkId: getOptionalString(formData, "ascapWorkId"),
    bmiWorkId: getOptionalString(formData, "bmiWorkId"),
    writers: getOptionalString(formData, "writers"),
    producers: getOptionalString(formData, "producers"),
    splitNotes: getOptionalString(formData, "splitNotes"),
  });

  await db.track.update({
    where: { id: trackId },
    data: {
      title: parsed.title,
      trackNumber: parsed.trackNumber,
      isrc: parsed.isrc,
      lyrics: parsed.lyrics,
      masterFileUrl: parsed.masterFileUrl || null,
      audioPreviewUrl: parsed.audioPreviewUrl || null,
      durationSeconds: parsed.durationSeconds,
      bpm: parsed.bpm,
      explicit: parsed.explicit,
      ascapStatus: parsed.ascapStatus,
      bmiStatus: parsed.bmiStatus,
      ascapWorkId: parsed.ascapWorkId,
      bmiWorkId: parsed.bmiWorkId,
      writers: parsed.writers,
      producers: parsed.producers,
      splitNotes: parsed.splitNotes,
    },
  });

  redirect(`/vault/releases/${releaseId}`);
}

export async function deleteTrackAction(formData: FormData) {
  await requireSession();
  const trackId = getString(formData, "trackId");
  const releaseId = getString(formData, "releaseId");

  if (!trackId) {
    redirect(`/vault/releases/${releaseId}`);
  }

  const release = await getReleaseById(releaseId);
  if (!release || !release.tracks.some((track) => track.id === trackId)) {
    redirect("/vault/releases");
  }

  await db.track.delete({
    where: { id: trackId },
  });

  redirect(`/vault/releases/${releaseId}`);
}
