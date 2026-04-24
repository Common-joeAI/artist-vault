import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { inboxDir } from "./distrokid-import-store";

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

/**
 * Phase 1 adapter:
 * write each imported release into a filesystem inbox.
 *
 * Replace this with your real DB import path once you wire Artist Vault's
 * release tables into the importer.
 */
export async function persistImportedReleaseDrafts(
  sessionToken: string,
  releases: ImportedRelease[],
): Promise<{
  releaseCount: number;
  importedFiles: string[];
  errors: string[];
}> {
  await fs.mkdir(inboxDir(), { recursive: true });

  const importedFiles: string[] = [];
  const errors: string[] = [];

  for (const release of releases) {
    try {
      const slug = slugify(`${release.artist_name ?? "unknown-artist"}-${release.title}`);
      const fingerprint = crypto
        .createHash("sha1")
        .update(JSON.stringify(release))
        .digest("hex")
        .slice(0, 12);

      const filename = `${sessionToken}--${slug}--${fingerprint}.json`;
      const fullPath = path.join(inboxDir(), filename);

      const draftRecord = {
        import_provider: "distrokid",
        import_session_token: sessionToken,
        imported_at: new Date().toISOString(),
        needs_review: true,
        release,
      };

      await fs.writeFile(fullPath, JSON.stringify(draftRecord, null, 2), "utf8");
      importedFiles.push(filename);
    } catch (error) {
      errors.push(
        `Failed to persist release "${release.title}": ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    }
  }

  return {
    releaseCount: importedFiles.length,
    importedFiles,
    errors,
  };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
