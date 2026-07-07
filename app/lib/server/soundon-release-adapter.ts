/**
 * soundon-release-adapter.ts
 *
 * Parses and normalizes data scraped from SoundOn (sound.on.fm)
 * into the shared ImportedRelease shape used by the vault importer.
 *
 * SoundOn data structure (scraped via browser extension):
 * {
 *   provider: "soundon",
 *   session_token: "...",
 *   releases: [
 *     {
 *       source_release_id: "so_12345",
 *       title: "My Album",
 *       artist_name: "Artist Name",
 *       release_date: "2024-01-15",
 *       upc: "123456789012",
 *       label_name: "Indie Label",
 *       artwork_url: "https://...",
 *       source_url: "https://sound.on.fm/...",
 *       stores: [{ name: "Spotify", url: "https://..." }],
 *       tracks: [
 *         {
 *           source_track_id: "sot_999",
 *           track_number: 1,
 *           title: "Track Name",
 *           isrc: "USXXX2400001",
 *           duration_text: "3:42",
 *           explicit: false
 *         }
 *       ],
 *       raw: {}
 *     }
 *   ]
 * }
 */

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

// ─────────────────────────────────────────────
// Payload validation
// ─────────────────────────────────────────────

export function sanitizeSoundOnPayload(body: unknown): {
  sessionToken: string;
  releases: ImportedRelease[];
} {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Record<string, unknown>;

  if (payload.provider !== "soundon") {
    throw new Error("Invalid provider  -  expected 'soundon'.");
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
    .filter((track, _, arr) => {
      return arr.findIndex((c) => c.source_track_id === track.source_track_id) === arr.indexOf(track);
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

  const unique = new Map<string, { name: string; url: string }>();
  for (const item of value) {
    const record = isRecord(item) ? item : {};
    const name = cleanText(record.name);
    const url = cleanText(record.url);
    if (name && url) unique.set(`${name}::${url}`, { name, url });
  }

  return [...unique.values()];
}

// ─────────────────────────────────────────────
// DB persistence
// ─────────────────────────────────────────────

async function getTargetArtistProfileId(userId?: string | null): Promise<string> {
  if (userId) {
    const owned = await db.artistProfile.findFirst({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (owned) return owned.id;
  }

  const fallback = await db.artistProfile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!fallback) {
    throw new Error("No artist profile found. Complete onboarding first.");
  }

  return fallback.id;
}

export async function persistSoundOnReleases(
  sessionToken: string,
  releases: ImportedRelease[],
): Promise<{ releaseCount: number; importedReleaseIds: string[]; errors: string[] }> {
  const session = await getSession();
  const artistId = await getTargetArtistProfileId(session?.userId);

  const importedReleaseIds: string[] = [];
  const errors: string[] = [];

  for (const release of releases) {
    try {
      const releaseDate = release.release_date ? new Date(release.release_date) : null;
      const releaseType = inferReleaseType(release.tracks.length);

      const spotifyUrl = mapStoreUrl(release.stores, /spotify/i);
      const appleMusicUrl = mapStoreUrl(release.stores, /apple|itunes/i);
      const youtubeMusicUrl = mapStoreUrl(release.stores, /youtube/i);

      const notesParts = [
        "Imported from SoundOn",
        `Session: ${sessionToken}`,
        `Source release ID: ${release.source_release_id}`,
        release.source_url ? `Source URL: ${release.source_url}` : null,
        release.upc ? `UPC: ${release.upc}` : null,
        release.label_name ? `Label: ${release.label_name}` : null,
      ].filter(Boolean);

      // Deduplicate: match on title + releaseDate + distributor
      const existing = await db.release.findFirst({
        where: {
          artistId,
          title: release.title,
          distributor: "SoundOn",
          ...(releaseDate ? { releaseDate } : {}),
        },
        select: { id: true },
      });

      let releaseId: string;

      if (existing) {
        await db.release.update({
          where: { id: existing.id },
          data: {
            releaseType,
            coverArtUrl: release.artwork_url ?? undefined,
            spotifyUrl,
            appleMusicUrl,
            youtubeMusicUrl,
            notes: notesParts.join("\n"),
          },
        });
        releaseId = existing.id;

        // Replace tracks on re-import
        await db.track.deleteMany({ where: { releaseId } });
      } else {
        const created = await db.release.create({
          data: {
            artistId,
            title: release.title,
            releaseType,
            distributor: "SoundOn",
            releaseDate,
            coverArtUrl: release.artwork_url ?? undefined,
            spotifyUrl,
            appleMusicUrl,
            youtubeMusicUrl,
            notes: notesParts.join("\n"),
          },
          select: { id: true },
        });
        releaseId = created.id;
      }

      if (release.tracks.length > 0) {
        await db.track.createMany({
          data: release.tracks.map((track, index) => ({
            releaseId,
            title: track.title,
            trackNumber: track.track_number ?? index + 1,
            isrc: track.isrc,
            durationSeconds: parseDurationToSeconds(track.duration_text),
            explicit: track.explicit ?? false,
          })),
        });
      }

      importedReleaseIds.push(releaseId);
    } catch (error) {
      errors.push(
        `Failed to import "${release.title}": ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return { releaseCount: importedReleaseIds.length, importedReleaseIds, errors };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function inferReleaseType(trackCount: number): "SINGLE" | "EP" | "ALBUM" {
  if (trackCount <= 1) return "SINGLE";
  if (trackCount <= 6) return "EP";
  return "ALBUM";
}

function mapStoreUrl(stores: Array<{ name: string; url: string }>, matcher: RegExp): string | null {
  const hit = stores.find((s) => matcher.test(s.name) || matcher.test(s.url));
  return hit?.url ?? null;
}

function parseDurationToSeconds(durationText: string | null): number | null {
  if (!durationText) return null;
  const text = durationText.trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
    const parts = text.split(":").map((p) => parseInt(p, 10));
    if (parts.some(Number.isNaN)) return null;
    return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (/^\d+$/.test(text)) {
    const n = parseInt(text, 10);
    return isFinite(n) ? n : null;
  }
  return null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const n = parseInt(value, 10);
    return isFinite(n) ? n : null;
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
  const t = value.replace(/\s+/g, " ").trim();
  return t || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
