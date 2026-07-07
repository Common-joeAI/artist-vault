import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Search DuckDuckGo for a platform link (no API key needed) ──────────────
async function searchForLink(query: string, domain: string): Promise<string> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " site:" + domain)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIArtistVault/1.0)" },
      signal: AbortSignal.timeout(2500),
    });
    const html = await res.text();
    // Extract first matching link from results
    const regex = new RegExp(`https?:\\/\\/${domain.replace(".", "\\.")}[^"'\\s<>]+`, "i");
    const match = html.match(regex);
    return match?.[0]?.split("&")[0] ?? "";
  } catch {
    return "";
  }
}

// ── Discover missing platform links ───────────────────────────────────────
async function discoverPlatformLinks(
  artistName: string,
  trackTitle: string,
  existing: Record<string, string>
): Promise<Record<string, string>> {
  const discovered: Record<string, string> = { ...existing };

  const platforms: { key: string; domain: string; label: string }[] = [
    { key: "spotify",    domain: "open.spotify.com",       label: "Spotify" },
    { key: "apple",      domain: "music.apple.com",         label: "Apple Music" },
    { key: "youtube",    domain: "youtube.com",             label: "YouTube" },
    { key: "tidal",      domain: "tidal.com",               label: "Tidal" },
    { key: "soundcloud", domain: "soundcloud.com",          label: "SoundCloud" },
    { key: "amazon",     domain: "music.amazon.com",        label: "Amazon Music" },
    { key: "deezer",     domain: "deezer.com",              label: "Deezer" },
    { key: "bandcamp",   domain: "bandcamp.com",            label: "Bandcamp" },
  ];

  // Only search for missing ones — run in parallel
  const searches = platforms
    .filter(p => !discovered[p.key])
    .map(async p => {
      const found = await searchForLink(`${artistName} ${trackTitle}`, p.domain);
      if (found) discovered[p.key] = found;
    });

  await Promise.allSettled(searches);
  return discovered;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const reqStart = Date.now();
    const { releaseId, trackId, additionalContext, batchMode } = body;

    if (!releaseId && !trackId) {
      return NextResponse.json({ error: "releaseId or trackId required" }, { status: 400 });
    }

    // ── 1. Pull everything from vault ───────────────────────────────────────
    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: "No artist profile found" }, { status: 404 });

    const fullArtist = await db.artistProfile.findUnique({
      where: { id: artist.id },
      include: { links: true },
    });

    // Map existing artist-level links
    const existingLinks: Record<string, string> = {};
    for (const l of fullArtist?.links ?? []) {
      const key = l.platform.toLowerCase().replace(/\s/g, "");
      existingLinks[key.includes("spotify") ? "spotify"
        : key.includes("apple") ? "apple"
        : key.includes("youtube") ? "youtube"
        : key.includes("tidal") ? "tidal"
        : key.includes("soundcloud") ? "soundcloud"
        : key.includes("amazon") ? "amazon"
        : key.includes("deezer") ? "deezer"
        : key.includes("bandcamp") ? "bandcamp"
        : key] = l.url;
    }

    // Release + track
    let release: any = null;
    let track: any = null;

    if (trackId) {
      track = await db.track.findUnique({ where: { id: trackId }, include: { release: true } });
      release = track?.release ?? null;
    } else if (releaseId) {
      release = await db.release.findUnique({ where: { id: releaseId }, include: { tracks: { orderBy: { trackNumber: "asc" } } } });
      track = release?.tracks?.[0] ?? null;
    }

    if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

    // Merge release-level links into existing
    if (release.spotifyUrl) existingLinks["spotify"] = release.spotifyUrl;
    if (release.appleMusicUrl) existingLinks["apple"] = release.appleMusicUrl;
    if (release.youtubeMusicUrl || release.youtubeUrl) existingLinks["youtube"] = release.youtubeMusicUrl || release.youtubeUrl;

    const title = track?.title ?? release.title;
    const artistName = artist.name;

    // ── 2. Discover missing platform links in parallel ──────────────────────
    // Skip DuckDuckGo discovery in batch mode to avoid bottleneck (use existing links only)
    const allLinks = batchMode ? existingLinks : await discoverPlatformLinks(artistName, title, existingLinks);

    const platformLinkMap: Record<string, string> = {
      "Spotify": allLinks["spotify"] ?? "",
      "Apple Music": allLinks["apple"] ?? "",
      "YouTube": allLinks["youtube"] ?? "",
      "Tidal": allLinks["tidal"] ?? "",
      "SoundCloud": allLinks["soundcloud"] ?? "",
      "Amazon Music": allLinks["amazon"] ?? "",
      "Deezer": allLinks["deezer"] ?? "",
      "Bandcamp": allLinks["bandcamp"] ?? "",
    };
    const platformLinks = Object.entries(platformLinkMap)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`);

    // ── 3. Pull track metadata ──────────────────────────────────────────────
    const isrc = track?.isrc ?? "";
    const upc = track?.upc ?? "";
    const lyrics = track?.lyrics ?? "";
    const bpm = track?.bpm ?? null;
    const writers = track?.writers ?? "";
    const producers = track?.producers ?? "";
    const proNotes = track?.proNotes ?? "";
    const explicit = track?.explicit ?? false;

    // Style context
    const recentReleases = await db.release.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { title: true, releaseType: true, notes: true },
    });

    const recentPrompts = await (db as any).prompt?.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { aiTool: true, enhancedGenre: true, enhancedMood: true, promptText: true },
    }).catch(() => []) ?? [];

    const releaseCatalog = recentReleases.map((r: any) => r.title).join(", ");
    const styleDna = recentPrompts.length > 0
      ? recentPrompts.map((p: any) => `[${p.aiTool}] ${p.enhancedGenre ?? ""} ${p.enhancedMood ?? ""}: ${p.promptText.slice(0, 80)}`).join(" | ")
      : "none";

    const streamingBlock = proNotes ? `Streaming/Distribution Data: ${proNotes}\n` : "";
    const lyricsBlock = lyrics ? `Full Lyrics:\n${lyrics.slice(0, 2000)}\n` : "Lyrics: not in vault\n";
    const linksBlock = platformLinks.length > 0 ? `Platform Links Found:\n${platformLinks.map(l => `  - ${l}`).join("\n")}\n` : "Platform Links: none found\n";

    // ── 4. Groq enhancement ─────────────────────────────────────────────────
    const prompt = `You are an expert music metadata writer for AI-generated and indie music. Generate the most comprehensive, accurate metadata possible using ALL vault data and discovered platform links below.

=== ARTIST PROFILE ===
Artist Name: ${artistName}
Bio: ${fullArtist?.bio ?? "not set"}
Genres: ${fullArtist?.genres ?? "not set"}
Location: ${fullArtist?.location ?? "not set"}
Website: ${fullArtist?.website ?? "not set"}
Style DNA / Prompts: ${styleDna}
Full Catalog (recent): ${releaseCatalog}

=== TRACK ===
Title: ${title}
ISRC: ${isrc || "not on file"}
UPC: ${upc || "not on file"}
BPM: ${bpm ?? "unknown"}
Writers: ${writers || "not set"}
Producers: ${producers || "not set"}
Explicit: ${explicit}
Release Type: ${release.releaseType}
Release Date: ${release.releaseDate ? release.releaseDate.toISOString().split("T")[0] : "not set"}
Distributor: ${release.distributor ?? "not set"}
${linksBlock}${streamingBlock}${lyricsBlock}
Additional Context: ${additionalContext || "none"}

Instructions:
- If lyrics provided: deeply analyze themes, emotional arc, storytelling, key imagery
- Reference streaming data in streaming_summary if available
- Use catalog and style DNA to maintain brand consistency
- Maximize discoverability on Spotify, Apple Music, YouTube Music
- Playlist pitch must be genuinely compelling
- Press blurb should read like a music journalist wrote it

Respond with ONLY raw valid JSON (no markdown, no code fences):
{
  "title": "polished title",
  "subtitle": "optional subtitle",
  "isrc": "${isrc}",
  "upc": "${upc}",
  "genre": "primary genre",
  "subgenre": "specific subgenre",
  "mood": ["mood1", "mood2", "mood3"],
  "themes": ["theme1", "theme2"],
  "bpm_estimate": ${bpm ?? 120},
  "key": "musical key",
  "energy_level": "low|medium|high",
  "lyrics_summary": "if lyrics provided: 2-3 sentences on themes/tone/storytelling. Otherwise empty string.",
  "description": "2-3 rich sentences for streaming platforms and press kits",
  "short_bio": "1 punchy sentence for playlists",
  "streaming_summary": "if streaming data available: brief performance summary. Otherwise empty string.",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
  "similar_artists": ["artist1","artist2","artist3"],
  "playlist_pitch": "2-3 compelling sentences for playlist curators",
  "press_blurb": "1 journalist-quality press sentence",
  "release_type": "${release.releaseType}",
  "explicit": ${explicit},
  "vault_context_used": true
}`;

    console.log(`[MetaEnhancer] ${batchMode ? "[BATCH]" : "[SINGLE]"} Enhancing: "${title}" by ${artistName}`);
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.45,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let metadata: Record<string, unknown> = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      metadata = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw };
    } catch { metadata = { raw }; }

    // Persist newly discovered links back to the release
    try {
      await db.release.update({
        where: { id: release.id },
        data: {
          spotifyUrl: allLinks["spotify"] || release.spotifyUrl,
          appleMusicUrl: allLinks["apple"] || release.appleMusicUrl,
          youtubeMusicUrl: allLinks["youtube"] || release.youtubeMusicUrl || release.youtubeUrl,
        },
      });
    } catch { /* non-fatal */ }

    console.log(`[MetaEnhancer] ✓ Done: "${title}" in ${Date.now() - reqStart}ms`);
    // Mark track as enhanced in DB
    if (track?.id) {
      try {
        await db.track.update({
          where: { id: track.id },
          data: { enhancerStatus: "completed", enhancedAt: new Date(), aiEnhancedJson: metadata as any },
        });
      } catch { /* non-fatal */ }
    }
    return NextResponse.json({ metadata, vaultContextUsed: true, platformLinks: platformLinkMap });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
