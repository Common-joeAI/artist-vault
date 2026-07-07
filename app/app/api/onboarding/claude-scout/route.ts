import { NextResponse } from "next/server";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_HTML_BYTES = 350_000;
const MAX_VISIBLE_TEXT_CHARS = 14_000;
const MAX_JSON_LD_CHARS = 18_000;

const ScoutRequestSchema = z.object({
  name: z.string().optional().default(""),
  bio: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  spotifyUrl: z.string().optional().default(""),
  appleMusicUrl: z.string().optional().default(""),
  youtubeMusicUrl: z.string().optional().default(""),
  websiteUrl: z.string().optional().default(""),
  otherUrl: z.string().optional().default(""),
});

const ScoutOutputSchema = z.object({
  artist: z.object({
    name: z.string().nullable(),
    bio: z.string().nullable(),
    photoUrl: z.string().nullable(),
    genres: z.array(z.string()),
    location: z.string().nullable(),
    confidence: z.number().nullable(),
    notes: z.string(),
  }).strict(),
  releases: z.array(z.object({
    title: z.string().nullable(),
    releaseType: z.enum(["SINGLE", "EP", "ALBUM"]).nullable(),
    releaseDate: z.string().nullable(),
    distributor: z.string().nullable(),
    label: z.string().nullable(),
    coverArtUrl: z.string().nullable(),
    streamingLinks: z.object({
      spotify: z.string().nullable(),
      appleMusic: z.string().nullable(),
      youtubeMusic: z.string().nullable(),
      website: z.string().nullable(),
      other: z.string().nullable(),
    }).strict(),
    tracks: z.array(z.object({
      title: z.string().nullable(),
      trackNumber: z.number().nullable(),
      isrc: z.string().nullable(),
      durationSeconds: z.number().nullable(),
      explicit: z.boolean().nullable(),
      confidence: z.number().nullable(),
      notes: z.string(),
    }).strict()),
    confidence: z.number().nullable(),
    sourceUrls: z.array(z.string()),
    notes: z.string(),
  }).strict()),
  sourceCoverage: z.array(z.object({
    platform: z.string(),
    url: z.string(),
    status: z.string(),
    details: z.string(),
  }).strict()),
  warnings: z.array(z.string()),
  nextSteps: z.array(z.string()),
}).strict();

type ScoutOutput = z.infer<typeof ScoutOutputSchema>;

type PageEvidence = {
  platform: string;
  url: string;
  status: string;
  details: string;
  title?: string | null;
  meta?: Record<string, string>;
  jsonLd?: string[];
  visibleText?: string;
};

function trimText(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getAttrs(tag: string) {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*["']([^"']*)["']/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(tag)) !== null) {
    attrs[match[1]!.toLowerCase()] = decodeHtml(match[2] ?? "");
  }

  return attrs;
}

function extractHtmlEvidence(html: string) {
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim() || null;
  const meta: Record<string, string> = {};

  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const attrs = getAttrs(match[0]);
    const key = attrs.property || attrs.name || attrs.itemprop;
    const content = attrs.content;
    if (key && content && !meta[key]) {
      meta[key] = trimText(content, 1000);
    }
  }

  const jsonLd: string[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const value = trimText(decodeHtml(match[1] ?? ""), MAX_JSON_LD_CHARS);
    if (value) jsonLd.push(value);
    if (jsonLd.length >= 8) break;
  }

  const rawVisible = decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
  const visibleText = trimText(denoiseVisibleText(rawVisible), MAX_VISIBLE_TEXT_CHARS);

  return { title, meta, jsonLd, visibleText };
}

const UI_NOISE_PATTERNS: RegExp[] = [
  /^view all (songs?|voices?|playlists?|albums?|tracks?|videos?)$/i,
  /^play .{0,80}$/i,
  /^@[\w.]{1,40}$/,
  /^\d+\s*(songs?|tracks?|plays?|likes?|followers?|views?)$/i,
  /^(follow|like|share|more|menu|home|search|library|explore|trending|charts|new|hot|top|settings|notifications|cancel|close|back)$/i,
  /join me on suno/i,
  /^[A-Z0-9\-]+ \| .{0,80}(suno|udio|spotify)/i,
  /^(sign in|log in|sign up|create account|get started|download app)$/i,
  /^untitled$/i,
];

function denoiseVisibleText(raw: string): string {
  const out: string[] = [];
  const segs = raw.split("|");
  for (let s = 0; s < segs.length; s++) {
    const nlines = segs[s].split(String.fromCharCode(10));
    for (let n = 0; n < nlines.length; n++) {
      const t = nlines[n].split(String.fromCharCode(13)).join("").trim();
      if (t.length >= 2 && t.length <= 150 && !UI_NOISE_PATTERNS.some(p => p.test(t))) out.push(t);
    }
  }
  return out.slice(0, 800).join(" | ");
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchEvidence(platform: string, rawUrl: string): Promise<PageEvidence> {
  const url = safeHttpUrl(rawUrl);
  if (!url) {
    return { platform, url: rawUrl, status: "skipped", details: "Invalid or empty URL." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "user-agent": "AIArtistVaultBot/1.0 (+https://aiartistvault.com; metadata onboarding assistant)",
      },
    });

    const contentType = res.headers.get("content-type") ?? "unknown";
    const buffer = Buffer.from(await res.arrayBuffer());
    const html = buffer.toString("utf8", 0, Math.min(buffer.byteLength, MAX_HTML_BYTES));

    if (!res.ok) {
      return {
        platform,
        url,
        status: "failed",
        details: `HTTP ${res.status}; content-type ${contentType}`,
        visibleText: trimText(html, 1200),
      };
    }

    const extracted = extractHtmlEvidence(html);
    return {
      platform,
      url,
      status: buffer.byteLength > MAX_HTML_BYTES ? "partial" : "fetched",
      details: `HTTP ${res.status}; content-type ${contentType}; bytes ${buffer.byteLength}`,
      ...extracted,
    };
  } catch (error) {
    return {
      platform,
      url,
      status: "failed",
      details: error instanceof Error ? error.message : "Unable to fetch page.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildScoutSchema() {
  const schema = zodToJsonSchema(ScoutOutputSchema, "ClaudeOnboardingScoutOutput") as any;
  return (schema.definitions?.ClaudeOnboardingScoutOutput ?? schema) as Record<string, unknown>;
}

async function askClaudeForScout(input: {
  currentOnboarding: z.infer<typeof ScoutRequestSchema>;
  evidence: PageEvidence[];
}): Promise<ScoutOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY.");
  }

  const system = `
You are Claude working inside AIArtistVault as a careful music catalog onboarding assistant.

You do not directly browse. The server has fetched public pages and given you extracted evidence. Analyze only that evidence.

Goal:
- Help an independent artist fill an artist profile.
- Suggest likely releases, release dates, track titles, cover art URLs, streaming links, distributor/label hints, and missing metadata.
- Improve onboarding when direct scraping is incomplete or messy.

Safety and data rules:
- Do not invent ISRCs, UPCs, release dates, distributors, labels, or track titles.
- If a detail is not present in the provided evidence, return null and explain what is missing.
- Keep suggestions separate from saved data. These are review suggestions, not final facts.
- Prefer high-confidence OpenGraph, JSON-LD, embedded metadata, visible official page text, and matching repeated facts across sources.
- If a site blocks fetches, mention that in sourceCoverage and nextSteps.
- Return JSON only.
  `.trim();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
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
              text: JSON.stringify(input),
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: buildScoutSchema(),
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic request failed: ${res.status} ${await res.text()}`);
  }

  const payload = await res.json() as any;
  const text = payload?.content?.find((part: any) => part.type === "text")?.text;
  if (!text) {
    throw new Error("Claude returned no scout JSON.");
  }

  return ScoutOutputSchema.parse(JSON.parse(text));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const data = ScoutRequestSchema.parse(await request.json());
    const candidates = [
      { platform: "spotify", url: data.spotifyUrl },
      { platform: "apple_music", url: data.appleMusicUrl },
      { platform: "youtube_music", url: data.youtubeMusicUrl },
      { platform: "website", url: data.websiteUrl },
      { platform: "other", url: data.otherUrl },
    ].filter((candidate) => candidate.url.trim());

    if (!candidates.length) {
      return NextResponse.json({ error: "Add at least one public artist page URL before running Claude Scout." }, { status: 400 });
    }

    const evidence = await Promise.all(candidates.map((candidate) => fetchEvidence(candidate.platform, candidate.url)));
    const scout = await askClaudeForScout({
      currentOnboarding: data,
      evidence,
    });

    return NextResponse.json({ ok: true, scout });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation failed." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Claude onboarding scout failed.";
    console.error("onboarding claude-scout error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
