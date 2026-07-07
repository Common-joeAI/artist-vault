import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Column maps — normalized (lowercase, stripped) header → internal field name
// Multiple aliases per field handle real-world export variations
// ─────────────────────────────────────────────────────────────────────────────
type NormalizedRow = {
  title: string;
  album: string | null;
  artist: string | null;
  upc: string | null;
  isrc: string | null;
  releaseDate: string | null;
  genre: string | null;
  label: string | null;
  releaseType: string | null;
  status: string | null;
  stores: string | null;
};

const ALIASES: Record<string, Record<string, string>> = {
  soundon: {
    // Track/song title
    "song title":        "title",
    "track title":       "title",
    "track name":        "title",
    "song name":         "title",
    "title":             "title",
    // Release/album
    "album/single title": "album",
    "album title":       "album",
    "release name":      "album",
    "release title":     "album",
    "album":             "album",
    // Artist
    "artist name":       "artist",
    "main artist":       "artist",
    "artist":            "artist",
    // IDs
    "upc":               "upc",
    "upc code":          "upc",
    "isrc":              "isrc",
    "isrc code":         "isrc",
    // Dates
    "release date":      "releaseDate",
    "released":          "releaseDate",
    "publish date":      "releaseDate",
    // Metadata
    "genre":             "genre",
    "label":             "label",
    "label name":        "label",
    "release type":      "releaseType",
    "type":              "releaseType",
    // Status
    "status":            "status",
    "release status":    "status",
    "distribution status": "status",
    // Stores
    "distributed to":    "stores",
    "stores":            "stores",
    "platforms":         "stores",
  },
  tunecore: {
    "title":             "title",
    "song":              "title",
    "album":             "album",
    "release":           "album",
    "artist":            "artist",
    "primary artist":    "artist",
    "upc":               "upc",
    "isrc":              "isrc",
    "release date":      "releaseDate",
    "genre":             "genre",
    "type":              "releaseType",
    "release type":      "releaseType",
    "stores":            "stores",
  },
  cdbaby: {
    "title":             "title",
    "track title":       "title",
    "artist":            "artist",
    "upc":               "upc",
    "isrc":              "isrc",
    "release date":      "releaseDate",
    "genre":             "genre",
    "album":             "album",
    "label":             "label",
  },
  amuse: {
    "title":             "title",
    "upc":               "upc",
    "isrc":              "isrc",
    "release date":      "releaseDate",
    "artist":            "artist",
    "album":             "album",
    "genre":             "genre",
    "status":            "status",
    "stores":            "stores",
  },
  unitedmasters: {
    "track title":       "title",
    "title":             "title",
    "album":             "album",
    "upc":               "upc",
    "isrc":              "isrc",
    "release date":      "releaseDate",
    "artist":            "artist",
    "genre":             "genre",
  },
  onerpm: {
    "title":             "title",
    "artist":            "artist",
    "upc":               "upc",
    "isrc":              "isrc",
    "release date":      "releaseDate",
    "genre":             "genre",
    "territory":         "stores",
    "album":             "album",
  },
  symphonic: {
    "release title":     "title",
    "title":             "title",
    "artist":            "artist",
    "upc":               "upc",
    "isrc":              "isrc",
    "release date":      "releaseDate",
    "genre":             "genre",
    "label":             "label",
    "album":             "album",
  },
};

const SUPPORTED = Object.keys(ALIASES);

// ─────────────────────────────────────────────────────────────────────────────
// CSV/TSV parser (handles quoted fields, \r\n, tabs or commas)
// ─────────────────────────────────────────────────────────────────────────────
function parseFile(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];
  const sep = lines[0].split("\t").length > lines[0].split(",").length ? "\t" : ",";

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQ)          { inQ = true; continue; }
      if (ch === '"' && inQ)           { if (line[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; } continue; }
      if (ch === sep && !inQ)          { result.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseRow(lines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().trim().replace(/[^a-z0-9/ _]/g, "").trim());

  return lines.slice(1)
    .filter(l => l.trim().replace(/,/g, "").replace(/\t/g, "").trim())
    .map(line => {
      const vals = parseRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (vals[i] ?? "").trim(); });
      return row;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Map raw row to NormalizedRow using distributor alias table
// Falls back to fuzzy match if exact alias not found
// ─────────────────────────────────────────────────────────────────────────────
function normalizeRow(raw: Record<string, string>, distId: string): NormalizedRow {
  const aliasMap = ALIASES[distId] ?? {};
  const out: Record<string, string> = {};

  for (const [rawKey, val] of Object.entries(raw)) {
    const cleaned = rawKey.toLowerCase().trim().replace(/[^a-z0-9/ _]/g, "").trim();
    const mapped = aliasMap[cleaned];
    if (mapped) {
      out[mapped] = out[mapped] || val; // first match wins
    } else {
      out[cleaned] = val; // keep unmapped cols as-is
    }
  }

  // Derive title from common fallbacks
  const title = out["title"] || out["song"] || out["track"] || out["name"] || "";

  return {
    title:       title.trim(),
    album:       out["album"]?.trim()       || null,
    artist:      out["artist"]?.trim()      || null,
    upc:         out["upc"]?.replace(/\D/g, "").trim() || null,
    isrc:        out["isrc"]?.replace(/[\s-]/g, "").toUpperCase().trim() || null,
    releaseDate: out["releaseDate"]?.trim() || null,
    genre:       out["genre"]?.trim()       || null,
    label:       out["label"]?.trim()       || null,
    releaseType: out["releaseType"]?.trim() || null,
    status:      out["status"]?.trim()      || null,
    stores:      out["stores"]?.trim()      || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Date parser — handles ISO, M/D/YYYY, year-only
// ─────────────────────────────────────────────────────────────────────────────
function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const c = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(c))      return new Date(c + "T00:00:00Z");
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(c)) {
    const [m, d, y] = c.split("/");
    return new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}T00:00:00Z`);
  }
  if (/^\d{4}$/.test(c))                   return new Date(`${c}-01-01T00:00:00Z`);
  const dt = new Date(c);
  return isNaN(dt.getTime()) ? null : dt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Infer release type from distributor field value
// ─────────────────────────────────────────────────────────────────────────────
function inferReleaseType(raw: string | null, trackCount: number): string {
  const t = (raw ?? "").toLowerCase();
  if (t.includes("album") || t.includes("lp"))   return "ALBUM";
  if (t.includes("ep"))                           return "EP";
  if (t.includes("single"))                       return "SINGLE";
  if (trackCount >= 7)                            return "ALBUM";
  if (trackCount >= 3)                            return "EP";
  return "SINGLE";
}

// ─────────────────────────────────────────────────────────────────────────────
// Group rows into releases
// Key: UPC (most reliable) → album title → track title (fallback for singles)
// ─────────────────────────────────────────────────────────────────────────────
function groupIntoReleases(rows: NormalizedRow[]): Map<string, NormalizedRow[]> {
  const groups = new Map<string, NormalizedRow[]>();

  for (const row of rows) {
    // Primary key: UPC — most reliable dedup key
    let key: string;
    if (row.upc && row.upc.length >= 12) {
      key = `upc:${row.upc}`;
    } else if (row.album && row.album.trim().length > 0) {
      // Group by album title (normalize whitespace + case)
      key = `album:${row.album.toLowerCase().trim()}`;
    } else {
      // Single track with no album — each is its own release
      key = `track:${row.title.toLowerCase().trim()}::${row.isrc ?? Math.random()}`;
    }

    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main POST handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file        = formData.get("file") as File | null;
    const distributorId = (formData.get("distributor") as string ?? "").toLowerCase().trim();

    if (!file)                          return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!SUPPORTED.includes(distributorId))
      return NextResponse.json({ error: `Unknown distributor: "${distributorId}". Supported: ${SUPPORTED.join(", ")}` }, { status: 400 });

    const text = await file.text();
    const rawRows = parseFile(text);
    if (rawRows.length === 0)
      return NextResponse.json({ error: "CSV appears empty or unreadable. Make sure it has a header row." }, { status: 400 });

    const normalizedRows = rawRows.map(r => normalizeRow(r, distributorId)).filter(r => r.title.length > 0);
    if (normalizedRows.length === 0)
      return NextResponse.json({ error: "No rows with a title found. Check that the file matches the expected column format." }, { status: 400 });

    // Get or create artist profile
    let profile = await db.artistProfile.findFirst({ where: { ownerUserId: session.userId } });
    if (!profile) {
      profile = await db.artistProfile.create({
        data: { ownerUserId: session.userId, name: "My Artist" },
      });
    }

    const releaseGroups = groupIntoReleases(normalizedRows);

    let releasesCreated = 0, releasesUpdated = 0;
    let tracksCreated = 0, tracksUpdated = 0;
    const errors: string[] = [];

    for (const [groupKey, rows] of releaseGroups.entries()) {
      try {
        const firstRow = rows[0];
        const releaseTitle = firstRow.album || firstRow.title || "Untitled";
        const upc = firstRow.upc || null;
        const releaseDate = parseDate(firstRow.releaseDate);
        const releaseType = inferReleaseType(firstRow.releaseType, rows.length);
        const distributor = distributorId.charAt(0).toUpperCase() + distributorId.slice(1);
        const notes = [
          `Imported from ${distributor}`,
          upc ? `UPC: ${upc}` : null,
          firstRow.status ? `Status: ${firstRow.status}` : null,
          firstRow.stores  ? `Stores: ${firstRow.stores}` : null,
          firstRow.label   ? `Label: ${firstRow.label}`   : null,
          firstRow.genre   ? `Genre: ${firstRow.genre}`   : null,
        ].filter(Boolean).join("\n");

        // Deduplicate: try UPC first, then title + distributor + date
        // Dedupe by (title, distributor, artist) tuple — UPC stored only in notes for now
        let release = await db.release.findFirst({
          where: {
            artistId: profile.id,
            title: releaseTitle,
            distributor: distributor,
          },
        });

        if (!release) {
          release = await db.release.create({
            data: {
              artistId:    profile.id,
              title:       releaseTitle,
              releaseType,
              distributor,
              releaseDate,
              notes,
            },
          });
          releasesCreated++;
        } else {
          // Update stale fields
          await db.release.update({
            where: { id: release.id },
            data: {
              releaseDate: releaseDate ?? release.releaseDate,
              notes,
            },
          });
          releasesUpdated++;
        }

        // Upsert each track
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const trackTitle = row.title || releaseTitle;
          const isrc = row.isrc || null;

          // Find by ISRC (most reliable) or by title within this release
          const existing = await db.track.findFirst({
            where: {
              releaseId: release.id,
              OR: [
                ...(isrc ? [{ isrc }] : []),
                { title: trackTitle },
              ],
            },
          });

          if (existing) {
            // Only update if we have new data to add
            const needsUpdate = (isrc && !existing.isrc) || (!existing.trackNumber && i + 1);
            if (needsUpdate) {
              await db.track.update({
                where: { id: existing.id },
                data: {
                  isrc:        isrc ?? existing.isrc,
                  trackNumber: existing.trackNumber ?? i + 1,
                },
              });
            }
            tracksUpdated++;
          } else {
            await db.track.create({
              data: {
                releaseId:   release.id,
                title:       trackTitle,
                isrc,
                trackNumber: i + 1,
              },
            });
            tracksCreated++;
          }
        }
      } catch (e: unknown) {
        const firstTitle = rows[0]?.album || rows[0]?.title || groupKey;
        errors.push(`"${firstTitle}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      success:         true,
      distributor:     distributorId,
      rowsParsed:      normalizedRows.length,
      releaseGroups:   releaseGroups.size,
      releasesCreated,
      releasesUpdated,
      tracksCreated,
      tracksUpdated,
      errors:          errors.slice(0, 10),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[CSV Import]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
