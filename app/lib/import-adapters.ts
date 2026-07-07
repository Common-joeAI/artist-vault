import { buildSpotifyImportPreview } from "@/lib/spotify-api";

export type ReleaseType = "SINGLE" | "EP" | "ALBUM";

export type ImportPreview = {
  url: string;
  platform: "spotify" | "apple_music" | "youtube" | "generic";
  pageTitle: string | null;
  description: string | null;
  discoveredReleases: Array<{
    title: string;
    inferredType: ReleaseType;
  }>;
};

function isPrivateHost(host: string) {
  const normalized = host.trim().toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
}

function detectPlatform(url: string): ImportPreview["platform"] {
  const host = new URL(url).hostname.toLowerCase();

  if (host.includes("spotify")) return "spotify";
  if (host.includes("music.apple")) return "apple_music";
  if (host.includes("youtube")) return "youtube";
  return "generic";
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function extractMeta(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match?.[1]?.replace(/\s+/g, " ").trim();
    if (value) return value;
  }

  return null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/'/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function inferType(title: string): ReleaseType {
  const lowered = title.toLowerCase();
  if (/\bep\b/.test(lowered)) return "EP";
  if (/\balbum\b/.test(lowered)) return "ALBUM";
  return "SINGLE";
}

function cleanReleaseTitle(value: string) {
  return decodeHtml(value)
    .replace(/\s+/g, " ")
    .replace(/^listen to\s+/i, "")
    .replace(/\s*[|·•-]\s*(spotify|apple music|youtube|youtube music)$/i, "")
    .trim();
}

function extractJsonLdReleaseNames(html: string) {
  const names: string[] = [];
  const scriptMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];

  for (const block of scriptMatches) {
    const jsonMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const raw = jsonMatch?.[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== "object") continue;

        const maybeType = typeof item["@type"] === "string" ? item["@type"].toLowerCase() : "";
        const maybeName = typeof item["name"] === "string" ? cleanReleaseTitle(item["name"]) : "";

        if (maybeName && ["musicalbum", "musicrecording", "album", "creativework"].includes(maybeType)) {
          names.push(maybeName);
        }

        for (const value of Object.values(item)) {
          if (Array.isArray(value)) {
            queue.push(...value);
          } else if (value && typeof value === "object") {
            queue.push(value);
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks from third-party pages.
    }
  }

  return names;
}

function extractReleaseCandidates(html: string) {
  const candidates = new Set<string>();

  for (const name of extractJsonLdReleaseNames(html)) {
    if (name.length >= 2) candidates.add(name);
  }

  const ogTitle = extractMeta(html, "og:title");
  if (ogTitle) candidates.add(cleanReleaseTitle(ogTitle));

  const title = extractTitle(html);
  if (title) candidates.add(cleanReleaseTitle(title));

  const textPatterns = [
    /"name"\s*:\s*"([^"]+)"/gi,
    /aria-label=["']([^"']+)["']/gi,
    /data-testid=["'][^"']*["'][^>]*>([^<]{2,120})</gi,
  ];

  for (const pattern of textPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const cleaned = cleanReleaseTitle(match[1] ?? "");
      if (cleaned.length >= 2 && cleaned.length <= 120) {
        candidates.add(cleaned);
      }
    }
  }

  return [...candidates]
    .filter((value) => value && !/^spotify$/i.test(value))
    .slice(0, 25)
    .map((title) => ({ title, inferredType: inferType(title) }));
}

export async function buildImportPreview(url: string): Promise<ImportPreview> {
  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only public HTTP(S) URLs are supported.");
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new Error("Blocked private or localhost URL.");
  }

  const spotifyPreview = await buildSpotifyImportPreview(url);
  if (spotifyPreview) {
    return spotifyPreview;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
      },
      cache: "no-store",
      redirect: "follow",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch ${url}: ${message}`);
  }

  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}. Received ${response.status}.`);
  }

  const html = await response.text();

  return {
    url,
    platform: detectPlatform(url),
    pageTitle: extractMeta(html, "og:title") ?? extractTitle(html),
    description: extractMeta(html, "og:description") ?? extractMeta(html, "description"),
    discoveredReleases: extractReleaseCandidates(html),
  };
}
