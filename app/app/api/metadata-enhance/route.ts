import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * IMPORTANT:
 * This patch is designed to be additive and low-risk.
 * It assumes you have:
 *   - a Prisma client export available at one of:
 *       ../../lib/prisma
 *       @/app/lib/prisma
 *       @/lib/prisma
 *   - a session helper available at one of:
 *       ../../lib/auth
 *       @/app/lib/auth
 *       @/lib/auth
 *
 * Update these imports to match the live code before enabling the route.
 */
import { db as prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

const StreamingLinksSchema = z.object({
  spotify: z.string().url().nullable().optional(),
  appleMusic: z.string().url().nullable().optional(),
  youtube: z.string().url().nullable().optional(),
  youtubeMusic: z.string().url().nullable().optional(),
  deezer: z.string().url().nullable().optional(),
  napster: z.string().url().nullable().optional(),
  songLink: z.string().url().nullable().optional(),
}).strict();

const LyricsSectionSchema = z.object({
  label: z.string(),
  startMs: z.number().int().nonnegative().nullable().optional(),
  endMs: z.number().int().nonnegative().nullable().optional(),
  text: z.string(),
}).strict();

const WordTimestampSchema = z.object({
  word: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1).nullable().optional(),
}).strict();

const EnhancementOutputSchema = z.object({
  normalizedMetadata: z.object({
    title: z.string().nullable(),
    artist: z.string().nullable(),
    album: z.string().nullable(),
    label: z.string().nullable(),
    releaseDate: z.string().datetime().nullable().optional(),
    isrc: z.string().nullable(),
    upc: z.string().nullable(),
    distributorName: z.string().nullable(),
    distributionKnown: z.boolean().nullable(),
    distributionStatusText: z.string().nullable(),
    streamingLinks: StreamingLinksSchema,
  }).strict(),
  lyrics: z.object({
    source: z.enum(["provider", "transcription", "manual", "unknown"]),
    confidence: z.number().min(0).max(1).nullable(),
    plainText: z.string().nullable(),
    sections: z.array(LyricsSectionSchema),
    words: z.array(WordTimestampSchema),
    lrc: z.string().nullable(),
    srt: z.string().nullable(),
    warnings: z.array(z.string()),
  }).strict(),
  rights: z.object({
    ascapReadyNotes: z.string(),
    bmiReadyNotes: z.string(),
    humanAuthorshipFlags: z.array(z.object({
      key: z.string(),
      level: z.enum(["info", "review", "high"]),
      note: z.string(),
    }).strict()),
    suggestedWriterSplits: z.array(z.object({
      name: z.string(),
      role: z.string(),
      percent: z.number().min(0).max(100).nullable(),
      rationale: z.string(),
      needsReview: z.boolean(),
    }).strict()),
  }).strict(),
  pressKit: z.object({
    shortBioSuggestion: z.string(),
    releaseBlurbSuggestion: z.string(),
    taglineSuggestion: z.string().nullable(),
  }).strict(),
  review: z.object({
    warnings: z.array(z.string()),
    confidenceSummary: z.string(),
    conflicts: z.array(z.string()),
    missingFields: z.array(z.string()),
  }).strict(),
}).strict();

type EnhancementOutput = z.infer<typeof EnhancementOutputSchema>;

const EnhanceRequestSchema = z.object({
  trackId: z.string().min(1),
  audioUrl: z.string().url().optional(),
  useExistingVaultFile: z.coerce.boolean().optional().default(true),
  forceTranscription: z.coerce.boolean().optional().default(false),
});

function sha256(input: Buffer | string) {
  return createHash("sha256").update(input).digest("hex");
}

function ensureAudioMime(mime: string | undefined) {
  if (!mime) return;
  const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/flac"];
  if (!allowed.includes(mime)) {
    throw new Error(`Unsupported audio type: ${mime}`);
  }
}

function toLrc(words: Array<{ word: string; startMs: number }>): string | null {
  if (!words.length) return null;
  return words.map((w) => {
    const total = Math.floor(w.startMs / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    const cs = String(Math.floor((w.startMs % 1000) / 10)).padStart(2, "0");
    return `[${mm}:${ss}.${cs}]${w.word}`;
  }).join("\n");
}

function toSrt(sections: Array<{ label: string; startMs?: number | null; endMs?: number | null; text: string }>): string | null {
  const timed = sections.filter((s) => typeof s.startMs === "number" && typeof s.endMs === "number");
  if (!timed.length) return null;

  const fmt = (ms: number) => {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const milli = ms % 1000;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(milli).padStart(3, "0")}`;
  };

  return timed
    .map((s, i) => `${i + 1}\n${fmt(s.startMs!)} --> ${fmt(s.endMs!)}\n[${s.label}]\n${s.text}`)
    .join("\n\n");
}

async function fetchAudioFromUrl(url: string): Promise<{ buffer: Buffer; mime?: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch source audio: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") ?? undefined;
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(`Source audio exceeds ${MAX_UPLOAD_BYTES} bytes.`);
  }
  return { buffer, mime };
}

async function recognizeWithAudd(buffer: Buffer, filename = "track.mp3") {
  const apiToken = process.env.AUDD_API_TOKEN;
  if (!apiToken) throw new Error("Missing AUDD_API_TOKEN");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  form.append("api_token", apiToken);
  form.append("return", "apple_music,spotify,deezer,napster,lyrics");
  form.append("market", "us");

  const response = await fetch("https://api.audd.io/", {
    method: "POST",
    body: form,
  });

  if (!response.ok) throw new Error(`AudD request failed: ${response.status}`);
  const payload = await response.json() as any;
  if (payload.status !== "success") {
    throw new Error(payload?.error?.error_message ?? "AudD recognition failed");
  }
  return payload.result ?? null;
}

async function transcribeWithAudioShake(audioUrl: string) {
  const apiKey = process.env.AUDIOSHAKE_API_KEY;
  if (!apiKey) throw new Error("Missing AUDIOSHAKE_API_KEY");

  const taskRes = await fetch("https://api.audioshake.ai/tasks", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      url: audioUrl,
      targets: [
        { model: "transcription", formats: ["json"] },
        { model: "alignment", formats: ["json"] },
      ],
    }),
  });

  if (!taskRes.ok) throw new Error(`AudioShake task create failed: ${taskRes.status}`);
  const task = await taskRes.json() as { id: string };

  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 2500));

    const statusRes = await fetch(`https://api.audioshake.ai/tasks/${task.id}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!statusRes.ok) continue;
    const status = await statusRes.json() as any;

    if (status.status === "completed") {
      const transcriptionTarget = (status.targets ?? []).find((t: any) => t.model === "transcription");
      const alignmentTarget = (status.targets ?? []).find((t: any) => t.model === "alignment");

      const transcriptionJson = transcriptionTarget?.assets?.[0]?.url
        ? await fetch(transcriptionTarget.assets[0].url).then((r) => r.json())
        : null;

      const alignmentJson = alignmentTarget?.assets?.[0]?.url
        ? await fetch(alignmentTarget.assets[0].url).then((r) => r.json())
        : null;

      const words = Array.isArray(alignmentJson?.words)
        ? alignmentJson.words.map((w: any) => ({
            word: String(w.word ?? ""),
            startMs: Math.round((Number(w.start ?? 0)) * 1000),
            endMs: Math.round((Number(w.end ?? 0)) * 1000),
            confidence: typeof w.confidence === "number" ? w.confidence : null,
          }))
        : [];

      const plainText =
        transcriptionJson?.lyrics ??
        transcriptionJson?.text ??
        (words.length ? words.map((w: { word: string }) => w.word).join(" ") : null);

      return {
        provider: "audioshake",
        plainText,
        confidence: null,
        sections: [],
        words,
        raw: { transcriptionJson, alignmentJson },
      };
    }

    if (status.status === "failed") throw new Error("AudioShake task failed");
  }

  throw new Error("AudioShake timed out");
}

async function transcribeWithAssemblyAI(audioUrl: string) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("Missing ASSEMBLYAI_API_KEY");

  const createRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      punctuate: true,
      format_text: true,
      speech_model: "universal",
      language_detection: true,
    }),
  });

  if (!createRes.ok) throw new Error(`AssemblyAI transcript create failed: ${createRes.status}`);
  const created = await createRes.json() as { id: string };

  for (let i = 0; i < 40; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${created.id}`, {
      headers: { authorization: apiKey },
    });

    if (!pollRes.ok) continue;
    const payload = await pollRes.json() as any;

    if (payload.status === "completed") {
      const words = Array.isArray(payload.words)
        ? payload.words.map((w: any) => ({
            word: String(w.text ?? ""),
            startMs: Number(w.start ?? 0),
            endMs: Number(w.end ?? 0),
            confidence: typeof w.confidence === "number" ? w.confidence : null,
          }))
        : [];

      return {
        provider: "assemblyai",
        plainText: payload.text ?? null,
        confidence: null,
        sections: [],
        words,
        raw: payload,
      };
    }

    if (payload.status === "error") {
      throw new Error(payload.error ?? "AssemblyAI transcription failed");
    }
  }

  throw new Error("AssemblyAI timed out");
}

async function getFallbackLyrics(audioUrl: string) {
  const provider = (process.env.LYRICS_FALLBACK_PROVIDER ?? "audioshake").toLowerCase();
  if (provider === "assemblyai") return transcribeWithAssemblyAI(audioUrl);
  return transcribeWithAudioShake(audioUrl);
}

function buildClaudeSchema() {
  const schema = zodToJsonSchema(EnhancementOutputSchema, "MetadataEnhancementOutput");
  return (schema.definitions?.MetadataEnhancementOutput ?? schema) as Record<string, unknown>;
}

async function enhanceWithClaude(input: {
  track: Record<string, unknown>;
  recognition: unknown;
  lyricsFallback: unknown;
}): Promise<EnhancementOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  if (!model) throw new Error("Missing ANTHROPIC_MODEL");

  const systemPrompt = `
You are a senior music metadata, publishing, and catalog-operations analyst for AIArtistVault.

Your job is to transform raw music recognition, transcription, vault metadata, and rights information into professional, structured catalog data for an independent artist platform.

You must:
1. Clean and normalize music metadata.
2. Preserve facts from source systems; do not invent identifiers.
3. Distinguish clearly between verified provider data, inferred data, and suggestions.
4. Produce structured, schema-valid JSON only.
5. Format lyrics professionally with section labels when confidence allows.
6. Keep all timestamps aligned to source timing when provided.
7. Generate ASCAP/BMI-ready notes with specific caveats for AI-assisted works.
8. Identify any human-authorship concerns for U.S. registration workflows without giving legal advice.
9. Suggest writer splits only when enough context exists; otherwise mark them as needs_review.
10. Generate concise press-kit language that sounds polished, artist-facing, and marketable.

Rules:
- Never fabricate ISRC, UPC, label, distributor, release date, or writer names.
- If data conflicts, keep the most likely verified value and explain the conflict in warnings.
- If lyrics are low confidence, preserve uncertain lines in notes rather than pretending certainty.
- When sectioning lyrics, prefer [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro].
- When content appears AI-generated or partially AI-assisted, set humanAuthorshipFlags carefully and conservatively.
- Do not provide legal conclusions; provide workflow notes and review flags.
- Return JSON only. No markdown. No prose outside schema.
  `.trim();

  const body = {
    model,
    max_tokens: 4000,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: JSON.stringify(input) }],
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        name: "metadata_enhancement_output",
        schema: buildClaudeSchema(),
      },
    },
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Anthropic request failed: ${res.status} ${await res.text()}`);
  }

  const payload = await res.json() as any;
  const textBlock = payload?.content?.find((c: any) => c.type === "text")?.text;
  if (!textBlock) throw new Error("Anthropic returned no structured JSON");
  return EnhancementOutputSchema.parse(JSON.parse(textBlock));
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let parsedBody: z.infer<typeof EnhanceRequestSchema>;
    let uploadedFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      uploadedFile = form.get("file") instanceof File ? (form.get("file") as File) : null;
      parsedBody = EnhanceRequestSchema.parse({
        trackId: form.get("trackId"),
        audioUrl: form.get("audioUrl"),
        useExistingVaultFile: form.get("useExistingVaultFile"),
        forceTranscription: form.get("forceTranscription"),
      });
    } else {
      parsedBody = EnhanceRequestSchema.parse(await request.json());
    }

    const track = await prisma.track.findUnique({
      where: { id: parsedBody.trackId },
      include: { release: true },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found." }, { status: 404 });
    }

    const job = await prisma.metadataEnhancementJob.create({
      data: {
        trackId: track.id,
        status: "processing",
        startedAt: new Date(),
        requestJson: parsedBody as any,
      },
    });

    let buffer: Buffer | null = null;
    let mime: string | undefined;
    let sourceUrl = parsedBody.audioUrl || undefined;
    let sourceFileName = uploadedFile?.name || null;

    if (uploadedFile) {
      if (uploadedFile.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "Upload exceeds size limit." }, { status: 400 });
      }
      buffer = Buffer.from(await uploadedFile.arrayBuffer());
      mime = uploadedFile.type || undefined;
    } else {
      const inferredTrackAudioUrl =
        (track as any).audioUrl ||
        (track as any).masterUrl ||
        (track as any).masterFileUrl ||
        parsedBody.audioUrl;

      if (!inferredTrackAudioUrl) {
        return NextResponse.json(
          { error: "No uploaded file provided and no existing vault audio URL found." },
          { status: 400 },
        );
      }

      sourceUrl = inferredTrackAudioUrl;
      const fetched = await fetchAudioFromUrl(inferredTrackAudioUrl);
      buffer = fetched.buffer;
      mime = fetched.mime;
    }

    ensureAudioMime(mime);
    const detected = await fileTypeFromBuffer(buffer!);
    if (detected?.mime) ensureAudioMime(detected.mime);

    const sourceAudioHash = sha256(buffer!);

    await prisma.metadataEnhancementJob.update({
      where: { id: job.id },
      data: {
        sourceFileName,
        sourceMimeType: mime ?? detected?.mime ?? null,
        sourceByteSize: buffer!.byteLength,
      },
    });

    const recognition = await recognizeWithAudd(buffer!, sourceFileName ?? "source.mp3");
    const auddLyrics = recognition?.lyrics?.lyrics ?? null;

    let lyricsFallback = {
      provider: "none",
      plainText: null,
      confidence: null,
      sections: [],
      words: [],
      raw: null,
    };

    if (parsedBody.forceTranscription || !auddLyrics) {
      if (!sourceUrl) {
        return NextResponse.json(
          { error: "Fallback transcription requires a URL-accessible source file." },
          { status: 400 },
        );
      }
      lyricsFallback = await getFallbackLyrics(sourceUrl);
    }

    const aiOutput = await enhanceWithClaude({
      track: {
        id: track.id,
        title: (track as any).title ?? null,
        isrc: (track as any).isrc ?? null,
        upc: (track as any).upc ?? null,
        existingLyrics: (track as any).lyricsText ?? (track as any).lyrics ?? null,
        writerSplits: (track as any).writerSplitsJson ?? null,
        release: (track as any).release ?? null,
      },
      recognition,
      lyricsFallback: {
        ...lyricsFallback,
        providerLyrics: auddLyrics,
      },
    });

    const finalOutput: EnhancementOutput = {
      ...aiOutput,
      lyrics: {
        ...aiOutput.lyrics,
        plainText: aiOutput.lyrics.plainText ?? auddLyrics ?? lyricsFallback.plainText,
        words: aiOutput.lyrics.words.length ? aiOutput.lyrics.words : lyricsFallback.words,
        lrc: aiOutput.lyrics.lrc ?? toLrc(
          (aiOutput.lyrics.words.length ? aiOutput.lyrics.words : lyricsFallback.words).map((w: any) => ({
            word: w.word,
            startMs: w.startMs,
          })),
        ),
        srt: aiOutput.lyrics.srt ?? toSrt(
          aiOutput.lyrics.sections.length ? aiOutput.lyrics.sections : lyricsFallback.sections,
        ),
      },
    };

    await prisma.track.update({
      where: { id: track.id },
      data: {
        enhancerStatus: "completed",
        enhancedAt: new Date(),
        lastEnhancementError: null,

        recognizedTitle: recognition?.title ?? finalOutput.normalizedMetadata.title ?? null,
        recognizedArtist: recognition?.artist ?? finalOutput.normalizedMetadata.artist ?? null,
        recognizedAlbum: recognition?.album ?? finalOutput.normalizedMetadata.album ?? null,
        recognizedLabel: recognition?.label ?? finalOutput.normalizedMetadata.label ?? null,
        recognizedReleaseDate: finalOutput.normalizedMetadata.releaseDate
          ? new Date(finalOutput.normalizedMetadata.releaseDate)
          : null,

        isrc: finalOutput.normalizedMetadata.isrc ?? undefined,
        upc: finalOutput.normalizedMetadata.upc ?? undefined,
        distributorName: finalOutput.normalizedMetadata.distributorName ?? undefined,
        distributionKnown: finalOutput.normalizedMetadata.distributionKnown ?? undefined,
        distributionStatusText: finalOutput.normalizedMetadata.distributionStatusText ?? undefined,

        streamingLinksJson: finalOutput.normalizedMetadata.streamingLinks as any,
        providerRawJson: { audd: recognition, lyricsFallback: lyricsFallback.raw } as any,
        aiEnhancedJson: finalOutput as any,

        lyricsText: finalOutput.lyrics.plainText ?? undefined,
        lyricsStructuredJson: {
          sections: finalOutput.lyrics.sections,
          words: finalOutput.lyrics.words,
          warnings: finalOutput.lyrics.warnings,
          sourceAudioHash,
        } as any,
        lyricsLrc: finalOutput.lyrics.lrc ?? undefined,
        lyricsSrt: finalOutput.lyrics.srt ?? undefined,
        lyricsSource: finalOutput.lyrics.source === "unknown" ? undefined : finalOutput.lyrics.source,
        lyricsConfidence: finalOutput.lyrics.confidence ?? undefined,

        ascapNotes: finalOutput.rights.ascapReadyNotes,
        bmiNotes: finalOutput.rights.bmiReadyNotes,
        humanAuthorshipFlagsJson: finalOutput.rights.humanAuthorshipFlags as any,
        suggestedWriterSplitsJson: finalOutput.rights.suggestedWriterSplits as any,
        pressKitSuggestionsJson: finalOutput.pressKit as any,
      },
    });

    await prisma.metadataEnhancementJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        transcriptionProvider: lyricsFallback.provider,
        aiModel: process.env.ANTHROPIC_MODEL ?? null,
        resultJson: {
          recognition,
          finalOutput,
        } as any,
      },
    });

    return NextResponse.json({
      ok: true,
      trackId: track.id,
      enhancedAt: new Date().toISOString(),
      recognition,
      enhancement: finalOutput,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Metadata enhancement failed";
    console.error("metadata-enhance error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
