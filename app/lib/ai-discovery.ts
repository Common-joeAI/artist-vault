/**
 * ai-discovery.ts
 *
 * AI-powered external catalog discovery.
 * Uses the Spotify public API + YouTube Data API to find an artist's
 * releases outside their distributor, then Claude analyzes and ranks results.
 */

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type DiscoveredRelease = {
  platform: "spotify" | "youtube" | "apple_music" | "soundcloud";
  url: string;
  title: string;
  artist: string;
  releaseDate: string | null;
  thumbnailUrl: string | null;
  confidence: "high" | "medium" | "low";
  alreadyInVault: boolean;
  notes: string;
};

export type DiscoveryResult = {
  artistName: string;
  totalFound: number;
  newReleases: DiscoveredRelease[];
  alreadyInVault: DiscoveredRelease[];
  aiSummary: string;
};

// ─────────────────────────────────────────────
// Spotify search (public API — no auth needed for search)
// ─────────────────────────────────────────────

async function searchSpotify(artistName: string): Promise<DiscoveredRelease[]> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("Spotify credentials not configured — skipping Spotify discovery.");
    return [];
  }

  try {
    // Get client credentials token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) return [];
    const tokenData = await tokenRes.json() as { access_token: string };
    const token = tokenData.access_token;

    // Search for artist
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!searchRes.ok) return [];
    const searchData = await searchRes.json() as {
      artists: { items: Array<{ id: string; name: string }> }
    };

    const artists = searchData.artists?.items ?? [];
    const exactMatch = artists.find(
      (a) => a.name.toLowerCase() === artistName.toLowerCase()
    ) ?? artists[0];

    if (!exactMatch) return [];

    // Get albums
    const albumsRes = await fetch(
      `https://api.spotify.com/v1/artists/${exactMatch.id}/albums?include_groups=album,single,ep&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!albumsRes.ok) return [];
    const albumsData = await albumsRes.json() as {
      items: Array<{
        id: string;
        name: string;
        release_date: string;
        images: Array<{ url: string }>;
        external_urls: { spotify: string };
      }>
    };

    return albumsData.items.map((album) => ({
      platform: "spotify" as const,
      url: album.external_urls.spotify,
      title: album.name,
      artist: artistName,
      releaseDate: album.release_date ?? null,
      thumbnailUrl: album.images[0]?.url ?? null,
      confidence: "high" as const,
      alreadyInVault: false,
      notes: "Found via Spotify catalog search",
    }));
  } catch (err) {
    console.error("Spotify discovery error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────
// YouTube search
// ─────────────────────────────────────────────

async function searchYouTube(artistName: string): Promise<DiscoveredRelease[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("YouTube API key not configured — skipping YouTube discovery.");
    return [];
  }

  try {
    const queries = [
      `${artistName} official audio`,
      `${artistName} music video`,
      `${artistName} full album`,
    ];

    const results: DiscoveredRelease[] = [];

    for (const query of queries) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`
      );

      if (!res.ok) continue;

      const data = await res.json() as {
        items: Array<{
          id: { videoId: string };
          snippet: {
            title: string;
            channelTitle: string;
            publishedAt: string;
            thumbnails: { medium: { url: string } };
          };
        }>
      };

      for (const item of data.items ?? []) {
        results.push({
          platform: "youtube",
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          releaseDate: item.snippet.publishedAt?.slice(0, 10) ?? null,
          thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? null,
          confidence: "medium",
          alreadyInVault: false,
          notes: `Found via YouTube search: "${query}"`,
        });
      }
    }

    // Deduplicate by URL
    const unique = new Map(results.map((r) => [r.url, r]));
    return [...unique.values()];
  } catch (err) {
    console.error("YouTube discovery error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────
// Cross-reference with vault
// ─────────────────────────────────────────────

async function crossReferenceWithVault(
  artistProfileId: string,
  discovered: DiscoveredRelease[]
): Promise<DiscoveredRelease[]> {
  const vaultReleases = await db.release.findMany({
    where: { artistId: artistProfileId },
    select: { title: true, spotifyUrl: true, youtubeMusicUrl: true, youtubeUrl: true },
  });

  const vaultTitles = new Set(vaultReleases.map((r) => r.title.toLowerCase()));
  const vaultUrls = new Set(
    vaultReleases.flatMap((r) =>
      [r.spotifyUrl, r.youtubeMusicUrl, r.youtubeUrl].filter(Boolean)
    )
  );

  return discovered.map((release) => ({
    ...release,
    alreadyInVault:
      vaultUrls.has(release.url) ||
      vaultTitles.has(release.title.toLowerCase()),
  }));
}

// ─────────────────────────────────────────────
// Claude analysis
// ─────────────────────────────────────────────

async function analyzeWithClaude(
  artistName: string,
  discovered: DiscoveredRelease[]
): Promise<string> {
  const newReleases = discovered.filter((r) => !r.alreadyInVault);

  if (newReleases.length === 0) {
    return "All discovered releases are already in your vault. Your catalog looks complete!";
  }

  const releaseList = newReleases
    .slice(0, 20) // cap at 20 for token budget
    .map((r, i) => `${i + 1}. "${r.title}" on ${r.platform} (${r.releaseDate ?? "unknown date"}) — ${r.url}`)
    .join("\n");

  const message = await claude.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are helping a music artist named "${artistName}" manage their catalog.
        
I found these releases that don't appear to be in their vault yet:

${releaseList}

Please provide a brief, friendly analysis (3-5 sentences) covering:
1. How many new releases were found and on which platforms
2. Any patterns you notice (e.g., lots of YouTube content, older releases)
3. A recommendation for what to do next (which releases to prioritize adding)

Be concise and practical. Talk directly to the artist.`,
      },
    ],
  });

  const text = message.content[0];
  return text.type === "text" ? text.text : "Discovery complete. Review the results above.";
}

// ─────────────────────────────────────────────
// Main discovery function
// ─────────────────────────────────────────────

export async function runExternalDiscovery(
  artistProfileId: string,
  artistName: string,
  ownerUserId?: string | null
): Promise<DiscoveryResult> {
  // Create discovery job record
  const job = await db.externalDiscoveryJob.create({
    data: {
      ownerUserId: ownerUserId ?? null,
      artistProfileId,
      artistName,
      status: "processing",
      startedAt: new Date(),
    },
  });

  try {
    // Run searches in parallel
    const [spotifyResults, youtubeResults] = await Promise.all([
      searchSpotify(artistName),
      searchYouTube(artistName),
    ]);

    const allDiscovered = [...spotifyResults, ...youtubeResults];

    // Cross-reference with vault
    const withVaultFlags = await crossReferenceWithVault(artistProfileId, allDiscovered);

    // AI analysis
    const aiSummary = await analyzeWithClaude(artistName, withVaultFlags);

    const newReleases = withVaultFlags.filter((r) => !r.alreadyInVault);
    const alreadyInVault = withVaultFlags.filter((r) => r.alreadyInVault);

    const result: DiscoveryResult = {
      artistName,
      totalFound: withVaultFlags.length,
      newReleases,
      alreadyInVault,
      aiSummary,
    };

    // Save results
    await db.externalDiscoveryJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        youtubeSearched: true,
        spotifySearched: true,
        discoveredJson: withVaultFlags as object[],
        aiSummaryJson: { summary: aiSummary } as object,
      },
    });

    return result;
  } catch (error) {
    await db.externalDiscoveryJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        failedAt: new Date(),
        errorJson: { message: error instanceof Error ? error.message : "Unknown error" } as object,
      },
    });
    throw error;
  }
}

// ─────────────────────────────────────────────
// AI metadata enhancement post-import
// ─────────────────────────────────────────────

export async function enhanceImportedReleaseMetadata(
  releaseId: string,
  rawData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const release = await db.release.findUnique({
    where: { id: releaseId },
    include: { tracks: true, artist: true },
  });

  if (!release) throw new Error("Release not found.");

  const message = await claude.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a music metadata expert. Review this imported release data and suggest improvements.

Release: "${release.title}" by ${release.artist.name}
Distributor: ${release.distributor ?? "Unknown"}
Tracks: ${release.tracks.map((t) => `"${t.title}" (ISRC: ${t.isrc ?? "missing"})`).join(", ")}

Raw import data:
${JSON.stringify(rawData, null, 2).slice(0, 2000)}

Return a JSON object with these fields (only include fields where you have confident suggestions):
{
  "genre": "suggested genre",
  "subgenre": "suggested subgenre", 
  "mood": "suggested mood tags (comma separated)",
  "missingIsrcs": ["list of track titles missing ISRCs"],
  "missingInfo": ["list of important missing fields"],
  "releaseNotes": "any important notes about this release",
  "suggestedTags": ["tag1", "tag2"]
}

Only return valid JSON, no explanation.`,
      },
    ],
  });

  const text = message.content[0];
  if (text.type !== "text") return {};

  try {
    return JSON.parse(text.text.trim());
  } catch {
    return { rawSuggestion: text.text };
  }
}
