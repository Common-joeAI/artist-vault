/**
 * ai-discovery.ts
 *
 * AI-powered external catalog discovery.
 * Uses Spotify public API + YouTube Data API to find an artist's releases,
 * then uses Groq (free, Llama 3) to analyze results.
 * Falls back to a static summary if no AI key is configured.
 */

import { db } from "@/lib/db";

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
// Spotify search
// ─────────────────────────────────────────────

async function searchSpotify(artistName: string): Promise<DiscoveredRelease[]> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("Spotify credentials not configured — skipping.");
    return [];
  }

  try {
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

    const albumsRes = await fetch(
      `https://api.spotify.com/v1/artists/${exactMatch.id}/albums?include_groups=album,single,ep&limit=50&market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!albumsRes.ok) {
      const errText = await albumsRes.text().catch(() => '');
      console.error(`Spotify albums 400 for artist ${exactMatch.id}: ${albumsRes.status} ${errText}`);
      return [];
    }
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
    console.warn("YouTube API key not configured — skipping.");
    return [];
  }

  try {
    const queries = [
      `${artistName} official audio`,
      `${artistName} music video`,
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
// AI analysis — Groq (free) with static fallback
// ─────────────────────────────────────────────

async function analyzeWithAI(
  artistName: string,
  discovered: DiscoveredRelease[]
): Promise<string> {
  const newReleases = discovered.filter((r) => !r.alreadyInVault);

  if (newReleases.length === 0) {
    return "All discovered releases are already in your vault. Your catalog looks complete!";
  }

  const releaseList = newReleases
    .slice(0, 20)
    .map((r, i) => `${i + 1}. "${r.title}" on ${r.platform} (${r.releaseDate ?? "unknown date"})`)
    .join("\n");

  const groqKey = process.env.GROQ_API_KEY;

  // ── Groq (free Llama 3) ──
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          max_tokens: 400,
          messages: [
            {
              role: "user",
              content: `You are helping a music artist named "${artistName}" manage their catalog.

I found these releases not yet in their vault:

${releaseList}

Give a brief, friendly analysis (3-5 sentences):
1. How many new releases found and on which platforms
2. Any patterns (older releases, lots of singles, etc.)
3. What to prioritize adding first

Be concise and talk directly to the artist.`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json() as {
          choices: Array<{ message: { content: string } }>;
        };
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (err) {
      console.error("Groq analysis error:", err);
    }
  }

  // ── Static fallback (no API key needed) ──
  const platforms = [...new Set(newReleases.map((r) => r.platform))];
  const earliest = newReleases
    .map((r) => r.releaseDate)
    .filter(Boolean)
    .sort()[0];

  return `Found ${newReleases.length} release${newReleases.length !== 1 ? "s" : ""} not yet in your vault across ${platforms.join(" and ")}. ` +
    (earliest ? `Your earliest discovered release dates back to ${earliest}. ` : "") +
    `Start by adding your most recent releases first to make sure your active catalog is complete, then work backwards through older material.`;
}

// ─────────────────────────────────────────────
// Main discovery function
// ─────────────────────────────────────────────

export async function runExternalDiscovery(
  artistProfileId: string,
  artistName: string,
  ownerUserId?: string | null
): Promise<DiscoveryResult> {
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
    const [spotifyResults, youtubeResults] = await Promise.all([
      searchSpotify(artistName),
      searchYouTube(artistName),
    ]);

    const allDiscovered = [...spotifyResults, ...youtubeResults];
    const withVaultFlags = await crossReferenceWithVault(artistProfileId, allDiscovered);
    const aiSummary = await analyzeWithAI(artistName, withVaultFlags);

    const newReleases = withVaultFlags.filter((r) => !r.alreadyInVault);
    const alreadyInVault = withVaultFlags.filter((r) => r.alreadyInVault);

    const result: DiscoveryResult = {
      artistName,
      totalFound: withVaultFlags.length,
      newReleases,
      alreadyInVault,
      aiSummary,
    };

    await db.externalDiscoveryJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        youtubeSearched: true,
        spotifySearched: true,
        discoveredJson: JSON.stringify(withVaultFlags),
        aiSummaryJson: JSON.stringify({ summary: aiSummary }),
      },
    });

    return result;
  } catch (error) {
    await db.externalDiscoveryJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        failedAt: new Date(),
        errorJson: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      },
    });
    throw error;
  }
}
