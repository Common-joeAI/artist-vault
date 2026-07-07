/**
 * Groq-powered metadata enhancer.
 *
 * Takes raw release/track metadata (from CSV imports, manual entry, or
 * discovery) and returns a cleaned, normalized, enriched version using
 * Llama 3 via Groq. Free, fast, and runs server-side only.
 *
 * Usage:
 *   const enhanced = await enhanceMetadata({ release, tracks });
 */

export type RawTrackInput = {
  title?: string | null;
  isrc?: string | null;
  durationSeconds?: number | null;
  explicit?: boolean | null;
  trackNumber?: number | null;
  lyrics?: string | null;
  aiPrompt?: string | null;
  aiTool?: string | null;
};

export type RawReleaseInput = {
  title?: string | null;
  artistName?: string | null;
  releaseType?: string | null;
  releaseDate?: string | null;
  genres?: string[] | null;
  moods?: string[] | null;
  tags?: string[] | null;
  description?: string | null;
  distributor?: string | null;
  label?: string | null;
  upc?: string | null;
  bpm?: number | null;
  key?: string | null;
  language?: string | null;
  tracks?: RawTrackInput[];
};

export type EnhancedTrack = {
  title: string | null;
  isrc: string | null;
  durationSeconds: number | null;
  explicit: boolean | null;
  trackNumber: number | null;
  aiPrompt: string | null;
  aiTool: string | null;
  suggestedTags: string[];
};

export type EnhancedRelease = {
  title: string | null;
  artistName: string | null;
  releaseType: "SINGLE" | "EP" | "ALBUM" | null;
  releaseDate: string | null;         // YYYY-MM-DD or null
  genres: string[];
  moods: string[];
  tags: string[];
  description: string | null;         // polished 2–3 sentence bio/description
  distributor: string | null;
  label: string | null;
  upc: string | null;
  bpm: number | null;
  key: string | null;
  language: string | null;
  tracks: EnhancedTrack[];
  enhancementNotes: string[];         // human-readable list of what was changed
};

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama3-8b-8192";

const SYSTEM_PROMPT = `You are a music metadata specialist for AI-generated music releases.
Your job is to clean, normalize, and enrich release metadata.

Rules:
- Fix capitalization (Title Case for song/album titles, sentence case for descriptions)
- Normalize release types: single track = SINGLE, 2-6 tracks = EP, 7+ = ALBUM
- Infer missing genres/moods from title, description, tags, and AI tool context
- Polished description: 2-3 engaging sentences written in third person, no filler phrases
- releaseDate must be YYYY-MM-DD format or null — never invent a date
- Never invent ISRC, UPC, distributor, or label
- Keep existing data unless it's clearly wrong (gibberish, nav text, UI strings)
- Flag obvious UI noise in title (e.g. "View all Songs", "Play ...", "@handles") and set title to null
- enhancementNotes: bullet list of what you changed, empty array if nothing changed
- Return ONLY valid JSON, no markdown, no commentary`;

function buildPrompt(input: RawReleaseInput): string {
  return `Clean and enhance this music release metadata. Return JSON matching the EnhancedRelease schema exactly.

INPUT:
${JSON.stringify(input, null, 2)}

OUTPUT SCHEMA:
{
  "title": "string|null",
  "artistName": "string|null", 
  "releaseType": "SINGLE|EP|ALBUM|null",
  "releaseDate": "YYYY-MM-DD|null",
  "genres": ["string"],
  "moods": ["string"],
  "tags": ["string"],
  "description": "string|null",
  "distributor": "string|null",
  "label": "string|null",
  "upc": "string|null",
  "bpm": "number|null",
  "key": "string|null",
  "language": "string|null",
  "tracks": [
    {
      "title": "string|null",
      "isrc": "string|null",
      "durationSeconds": "number|null",
      "explicit": "boolean|null",
      "trackNumber": "number|null",
      "aiPrompt": "string|null",
      "aiTool": "string|null",
      "suggestedTags": ["string"]
    }
  ],
  "enhancementNotes": ["string"]
}`;
}

function safeJsonParse(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to extract JSON object from response
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        throw new Error("Groq returned unparseable JSON");
      }
    }
    throw new Error("No JSON found in Groq response");
  }
}

export async function enhanceMetadata(
  input: RawReleaseInput,
  options: { timeoutMs?: number } = {}
): Promise<EnhancedRelease> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Graceful fallback — return cleaned input without AI
    return buildFallback(input);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 15_000
  );

  try {
    const res = await fetch(GROQ_API, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildPrompt(input) },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`Groq metadata enhance failed ${res.status}: ${errText}`);
      return buildFallback(input);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = safeJsonParse(raw) as EnhancedRelease;
    return parsed;
  } catch (err) {
    clearTimeout(timeout);
    console.error("Groq metadata enhance error:", err);
    return buildFallback(input);
  }
}

/** Best-effort cleanup without AI — used as fallback if Groq is unavailable */
function buildFallback(input: RawReleaseInput): EnhancedRelease {
  function toTitleCase(s: string) {
    return s.replace(/\w\S*/g, (w) =>
      ["a", "an", "the", "and", "but", "or", "for", "nor", "in", "on", "at", "to", "by", "of"]
        .includes(w.toLowerCase())
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
  }

  const trackCount = input.tracks?.length ?? 1;
  const inferredType =
    input.releaseType?.toUpperCase() === "ALBUM" ? "ALBUM"
      : input.releaseType?.toUpperCase() === "EP" ? "EP"
      : trackCount >= 7 ? "ALBUM"
      : trackCount >= 2 ? "EP"
      : "SINGLE";

  return {
    title: input.title ? toTitleCase(input.title) : null,
    artistName: input.artistName ?? null,
    releaseType: inferredType as "SINGLE" | "EP" | "ALBUM",
    releaseDate: input.releaseDate ?? null,
    genres: input.genres ?? [],
    moods: input.moods ?? [],
    tags: input.tags ?? [],
    description: input.description ?? null,
    distributor: input.distributor ?? null,
    label: input.label ?? null,
    upc: input.upc ?? null,
    bpm: input.bpm ?? null,
    key: input.key ?? null,
    language: input.language ?? "en",
    tracks: (input.tracks ?? []).map((t, i) => ({
      title: t.title ? toTitleCase(t.title) : null,
      isrc: t.isrc ?? null,
      durationSeconds: t.durationSeconds ?? null,
      explicit: t.explicit ?? null,
      trackNumber: t.trackNumber ?? i + 1,
      aiPrompt: t.aiPrompt ?? null,
      aiTool: t.aiTool ?? null,
      suggestedTags: [],
    })),
    enhancementNotes: ["AI unavailable — applied basic title case normalization"],
  };
}
