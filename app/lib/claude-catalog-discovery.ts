import { z } from "zod";

const MAX_SNAPSHOT_CHARS = 18_000;
const MAX_URLS = 8;

const DiscoveryTrackSchema = z.object({
  title: z.string().nullable().default(null),
  trackNumber: z.number().int().positive().nullable().default(null),
  isrc: z.string().nullable().default(null),
  durationSeconds: z.number().int().positive().nullable().default(null),
  explicit: z.boolean().nullable().default(null),
}).passthrough();

const DiscoveryReleaseSchema = z.object({
  title: z.string().nullable().default(null),
  releaseType: z.enum(["SINGLE", "EP", "ALBUM"]).nullable().default(null),
  releaseDate: z.string().nullable().default(null),
  distributor: z.string().nullable().default(null),
  label: z.string().nullable().default(null),
  upc: z.string().nullable().default(null),
  coverArtUrl: z.string().nullable().default(null),
  spotifyUrl: z.string().nullable().default(null),
  appleMusicUrl: z.string().nullable().default(null),
  youtubeMusicUrl: z.string().nullable().default(null),
  sourceUrls: z.array(z.string()).default([]),
  tracks: z.array(DiscoveryTrackSchema).default([]),
  confidence: z.number().min(0).max(1).nullable().default(null),
  notes: z.string().nullable().default(null),
}).passthrough();

export const CatalogDiscoverySchema = z.object({
  artist: z.object({
    name: z.string().nullable().default(null),
    bio: z.string().nullable().default(null),
    imageUrl: z.string().nullable().default(null),
    websiteUrl: z.string().nullable().default(null),
    genres: z.array(z.string()).default([]),
    socialLinks: z.record(z.string()).default({}),
  }).passthrough(),
  releases: z.array(DiscoveryReleaseSchema).default([]),
  warnings: z.array(z.string()).default([]),
  confidenceSummary: z.string().default("Claude generated suggestions from public page snapshots. Review before saving."),
}).passthrough();

export type CatalogDiscovery = z.infer<typeof CatalogDiscoverySchema>;

export type SiteSnapshot = {
  url: string;
  ok: boolean;
  status?: number;
  finalUrl?: string;
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  imageUrl?: string | null;
  jsonLd?: unknown[];
  textSample?: string;
  error?: string;
};

// Lines that are clearly streaming UI chrome  -  not real release titles
const UI_NOISE_PATTERNS: RegExp[] = [
  /^view all (songs?|voices?|playlists?|albums?|tracks?|videos?)$/i,
  /^play .{0,80}$/i,
  /^@[\w.]{1,40}$/,
  /^\d+\s*(songs?|tracks?|plays?|likes?|followers?|views?)$/i,
  /^(follow|like|share|more|menu|home|search|library|explore|trending|charts|new|hot|top|settings|notifications)$/i,
  /^[A-Z0-9\-]+ \| .{0,60}suno/i,
  /join me on suno/i,
  /^(sign in|log in|sign up|create account|get started|download app)$/i,
  /^untitled$/i,
  /^(single|ep|album|playlist)$/i,
];

function isUiNoise(line: string): boolean {
  const t = line.trim();
  if (t.length < 2 || t.length > 120) return true;
  return UI_NOISE_PATTERNS.some(p => p.test(t));
}

function denoisePageText(raw: string): string {
  const out: string[] = [];
  const segs = raw.split("|");
  for (let s = 0; s < segs.length; s++) {
    const nlines = segs[s].split(String.fromCharCode(10));
    for (let n = 0; n < nlines.length; n++) {
      const t = nlines[n].split(String.fromCharCode(13)).join("").trim();
      if (t.length > 1 && !isUiNoise(t)) out.push(t);
    }
  }
  return out.slice(0, 600).join(" | ");
}

function cleanText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html: string, regexes: RegExp[]) {
  for (const regex of regexes) {
    const match = html.match(regex);
    if (match?.[1]) return cleanText(match[1]);
  }
  return null;
}

function absoluteUrl(value: string | null, baseUrl: string) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function extractJsonLd(html: string) {
  const blocks: unknown[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) && blocks.length < 8) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      // Ignore malformed JSON-LD rather than failing the whole discovery pass.
    }
  }
  return blocks;
}

export async function fetchSiteSnapshot(url: string): Promise<SiteSnapshot> {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { url, ok: false, error: "Only http and https URLs are supported." };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    const response = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "AIArtistVault/1.0 metadata discovery (+https://aiartistvault.com)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") ?? "";
    const html = contentType.includes("text") || contentType.includes("html")
      ? await response.text()
      : "";

    if (!response.ok) {
      return { url, ok: false, status: response.status, finalUrl: response.url, error: `Fetch failed with ${response.status}` };
    }

    const title = firstMatch(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ]);

    const description = firstMatch(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ]);

    const canonicalUrl = absoluteUrl(firstMatch(html, [
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ]), response.url || url);

    const imageUrl = absoluteUrl(firstMatch(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ]), response.url || url);

    return {
      url,
      ok: true,
      status: response.status,
      finalUrl: response.url,
      title,
      description,
      canonicalUrl,
      imageUrl,
      jsonLd: extractJsonLd(html),
      textSample: denoisePageText(cleanText(html)).slice(0, MAX_SNAPSHOT_CHARS),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: error instanceof Error ? error.message : "Unable to fetch URL.",
    };
  }
}

function safeJsonParse(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Claude did not return valid JSON.");
  }
}

export async function discoverCatalogWithClaude(input: {
  artistName?: string | null;
  urls: string[];
  existing?: unknown;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY.");
  }

  const uniqueUrls = Array.from(new Set(input.urls.map((url) => url.trim()).filter(Boolean))).slice(0, MAX_URLS);
  const snapshots = await Promise.all(uniqueUrls.map(fetchSiteSnapshot));

  const system = `You are AIArtistVault's catalog discovery assistant. You receive public page snapshots from artist pages, streaming pages, websites, distributor pages, and social pages. Extract likely artist profile data and release metadata. Return JSON only. Do not invent ISRC, UPC, distributor, label, dates, tracks, or URLs. If a value is not clearly present, use null. Treat every result as a suggestion that requires human review.`;

  const expectedShape = {
    artist: {
      name: "string|null",
      bio: "string|null",
      imageUrl: "string|null",
      websiteUrl: "string|null",
      genres: ["string"],
      socialLinks: { platform: "url" },
    },
    releases: [
      {
        title: "string|null",
        releaseType: "SINGLE|EP|ALBUM|null",
        releaseDate: "YYYY-MM-DD|null",
        distributor: "string|null",
        label: "string|null",
        upc: "string|null",
        coverArtUrl: "string|null",
        spotifyUrl: "string|null",
        appleMusicUrl: "string|null",
        youtubeMusicUrl: "string|null",
        sourceUrls: ["string"],
        tracks: [
          {
            title: "string|null",
            trackNumber: "number|null",
            isrc: "string|null",
            durationSeconds: "number|null",
            explicit: "boolean|null",
          },
        ],
        confidence: "number|null",
        notes: "string|null",
      },
    ],
    warnings: ["string"],
    confidenceSummary: "string",
  };

  const body = {
    model,
    max_tokens: 5000,
    temperature: 0.1,
    system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify({
              expectedShape,
              artistName: input.artistName ?? null,
              existing: input.existing ?? null,
              snapshots,
            }),
          },
        ],
      },
      {
        role: "assistant",
        content: "{",
      },
    ],
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Claude discovery failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json() as any;
  const text = payload?.content?.find((block: any) => block.type === "text")?.text;
  if (!text) throw new Error("Claude returned no discovery text.");

  const parsed = safeJsonParse(`{${text}`);
  const discovery = CatalogDiscoverySchema.parse(parsed);

  return {
    model,
    snapshots,
    discovery,
  };
}
