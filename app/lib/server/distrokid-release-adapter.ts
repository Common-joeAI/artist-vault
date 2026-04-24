import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type ImportedTrack = {
  source_track_id: string;
  track_number: number | null;
  title: string;
  isrc: string | null;
  duration_text: string | null;
  explicit: boolean | null;
};

export type ImportedRelease = {
  source_release_id: string;
  title: string;
  artist_name: string | null;
  release_date: string | null;
  upc: string | null;
  label_name: string | null;
  artwork_url: string | null;
  source_url: string | null;
  stores: Array<{ name: string; url: string }>;
  tracks: ImportedTrack[];
  raw: Record<string, unknown>;
};

export function sanitizeIncomingPayload(body: unknown): {
  sessionToken: string;
  releases: ImportedRelease[];
} {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;

  if (payload.provider !== "distrokid") {
    throw new Error("Invalid provider.");
  }

  if (typeof payload.session_token !== "string" || !payload.session_token.trim()) {
    throw new Error("Missing session_token.");
  }

  if (!Array.isArray(payload.releases)) {
    throw new Error("Missing releases array.");
  }

  const releases = payload.releases.map((release) => sanitizeRelease(release));

  return {
    sessionToken: payload.session_token,
    releases,
  };
}

function sanitizeRelease(value: unknown): ImportedRelease {
  if (!value || typeof value !== "object") {
    throw new Error("Encountered invalid release payload.");
  }

  const release = value as Record<string, unknown>;
  const sourceReleaseId = cleanText(release.source_release_id);
  const title = cleanText(release.title);

  if (!sourceReleaseId || !title) {
    throw new Error("Each release must include source_release_id and title.");
  }

  const tracksInput = Array.isArray(release.tracks) ? release.tracks : [];
  const tracks: ImportedTrack[] = tracksInput
    .map((track, index) => sanitizeTrack(track, index))
    .filter((track, index, arr) => {
      return arr.findIndex((candidate) => candidate.source_track_id === track.source_track_id) === index;
    });

  return {
    source_release_id: sourceReleaseId,
    title,
    artist_name: cleanText(release.artist_name),
    release_date: normalizeDate(release.release_date),
    upc: cleanText(release.upc),
    label_name: cleanText(release.label_name),
    artwork_url: cleanText(release.artwork_url),
    source_url: cleanText(release.source_url),
    stores: sanitizeStores(release.stores),
    tracks,
    raw: isRecord(release.raw) ? release.raw : {},
  };
}

function sanitizeTrack(value: unknown, index: number): ImportedTrack {
  const track = isRecord(value) ? value : {};
  const title = cleanText(track.title) ?? `Track ${index + 1}`;

  return {
    source_track_id: cleanText(track.source_track_id) ?? String(index + 1),
    track_number: normalizeInteger(track.track_number),
    title,
    isrc: cleanText(track.isrc),
    duration_text: cleanText(track.duration_text),
    explicit: normalizeBoolean(track.explicit),
  };
}

function sanitizeStores(value: unknown): Array<{ name: string; url: string }> {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item) => {
      const record = isRecord(item) ? item : {};
      const name = cleanText(record.name);
      const url = cleanText(record.url);

      if (!name || !url) return null;
      return { name, url };
    })
    .filter((item): item is { name: string; url: string } => Boolean(item));

  const unique = new Map<string, { name: string; url: string }>();
  for (const item of normalized) {
    unique.set(`${item.name}::${item.url}`, item);
  }

  return [...unique.values()];
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (/^(true|yes|1|explicit)$/i.test(value)) return true;
    if (/^(false|no|0|clean)$/i.test(value)) return false;
  }
  return null;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function inferReleaseType(trackCount: number): "SINGLE" | "EP" | "ALBUM" {
  if (trackCount <= 1) return "SINGLE";
  if (trackCount <= 6) return "EP";
  return "ALBUM";
}

function mapStoreUrl(
  stores: Array<{ name: string; url: string }>,
  matcher: RegExp,
): string | null {
  const hit = stores.find((store) => matcher.test(store.name) || matcher.test(store.url));
  return hit?.url ?? null;
}

function parseDurationToSeconds(durationText: string | null): number | null {
  if (!durationText) return null;

  const text = durationText.trim();

  // mm:ss or hh:mm:ss
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
    const parts = text.split(":").map((part) => Number.parseInt(part, 10));
    if (parts.some((part) => Number.isNaN(part))) return null;

    if (parts.length === 2) {
      return (parts[0] * 60) + parts[1];
    }

    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }

  // plain integer seconds
  if (/^\d+$/.test(text)) {
    const parsed = Number.parseInt(text, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function getTargetArtistProfileId(): Promise<string> {
  const session = await getSession();

  if (session?.userId) {
    const owned = await db.artistProfile.findFirst({
      where: { ownerUserId: session.userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (owned) {
      return owned.id;
    }
  }

  const fallback = await db.artistProfile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!fallback) {
    throw new Error("No artist profile exists yet. Run onboarding before importing releases.");
  }

  return fallback.id;
}

export async function persistImportedReleaseDrafts(
  sessionToken: string,
  releases: ImportedRelease[],
): Promise<{
  releaseCount: number;
  importedFiles: string[];
  errors: string[];
}> {
  const importedFiles: string[] = [];
  const errors: string[] = [];

  const artistId = await getTargetArtistProfileId();

  for (const release of releases) {
    try {
      const releaseDate = release.release_date ? new Date(release.release_date) : null;
      const releaseType = inferReleaseType(release.tracks.length);

      const spotifyUrl = mapStoreUrl(release.stores, /spotify/i);
      const appleMusicUrl = mapStoreUrl(release.stores, /apple|itunes/i);
      const youtubeMusicUrl = mapStoreUrl(release.stores, /youtube/i);

      const notesParts = [
        "Imported from DistroKid",
        `Session: ${sessionToken}`,
        `Source release ID: ${release.source_release_id}`,
        release.source_url ? `Source URL: ${release.source_url}` : null,
        release.upc ? `UPC: ${release.upc}` : null,
        release.label_name ? `Label: ${release.label_name}` : null,
      ].filter(Boolean);

      const existing = await db.release.findFirst({
        where: {
          artistId,
          title: release.title,
          releaseDate: releaseDate ?? undefined,
        },
        select: { id: true },
      });

      let releaseId: string;

      if (existing) {
        const updated = await db.release.update({
          where: { id: existing.id },
          data: {
            releaseType,
            distributor: "DistroKid",
            releaseDate,
            coverArtUrl: release.artwork_url,
            spotifyUrl,
            appleMusicUrl,
            youtubeMusicUrl,
            notes: notesParts.join("\n"),
          },
          select: { id: true },
        });

        releaseId = updated.id;

        await db.track.deleteMany({
          where: { releaseId },
        });
      } else {
        const created = await db.release.create({
          data: {
            artistId,
            title: release.title,
            releaseType,
            distributor: "DistroKid",
            releaseDate,
            coverArtUrl: release.artwork_url,
            spotifyUrl,
            appleMusicUrl,
            youtubeMusicUrl,
            notes: notesParts.join("\n"),
          },
          select: { id: true },
        });

        releaseId = created.id;
      }

      if (release.tracks.length) {
        await db.track.createMany({
          data: release.tracks.map((track, index) => ({
            releaseId,
            title: track.title,
            trackNumber: track.track_number ?? index + 1,
            isrc: track.isrc,
            durationSeconds: parseDurationToSeconds(track.duration_text),
            explicit: track.explicit ?? false,
            lyrics: null,
          })),
        });
      }

      importedFiles.push(releaseId);
    } catch (error) {
      errors.push(
        `Failed to import "${release.title}": ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    }
  }

  return {
    releaseCount: importedFiles.length,
    importedFiles,
    errors,
  };
}
