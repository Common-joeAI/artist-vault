import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { db } from "@/lib/db";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN ?? "";
const UPLOAD_DIR   = process.env.ARTIST_VAULT_UPLOAD_DIR ?? "./public/uploads";

// ── Priority 1: Genius authoritative lyrics ──────────────────────────────────
async function geniusSearch(artist: string, title: string): Promise<string | null> {
  if (!GENIUS_TOKEN) return null;
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://api.genius.com/search?q=${q}&per_page=5`, {
      headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    const hits: any[] = data?.response?.hits ?? [];
    const match = hits.find(h =>
      h.result?.primary_artist?.name?.toLowerCase().includes(artist.toLowerCase()) ||
      h.result?.title?.toLowerCase().includes(title.toLowerCase())
    );
    return match?.result?.url ?? null;
  } catch { return null; }
}

async function geniusScrapeLyrics(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIArtistVault/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const matches = [...html.matchAll(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g)];
    if (!matches.length) return null;
    const text = matches.map((m: RegExpMatchArray) => (m[1] as string)).join("\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
      .replace(/\[/g, "\n[").trim();
    return text.length > 50 ? text : null;
  } catch { return null; }
}

// ── Priority 3: Groq Whisper transcription from stored master MP3 ────────────
async function transcribeFromAudio(masterFileUrl: string, userId: string): Promise<string | null> {
  try {
    // Resolve local file path from public URL
    // URL format: /uploads/masters/{userId}/{filename}
    const urlPath = masterFileUrl.replace(/^\/uploads/, "");
    const localPath = path.resolve(process.cwd(), UPLOAD_DIR, urlPath.replace(/^\//, ""));

    if (!fs.existsSync(localPath)) {
      console.log("Audio file not found at:", localPath);
      return null;
    }

    const stat = fs.statSync(localPath);
    const sizeMb = stat.size / (1024 * 1024);

    // Groq Whisper accepts up to 25MB
    if (sizeMb > 25) {
      console.log("Audio file too large for Whisper:", sizeMb.toFixed(1), "MB");
      return null;
    }

    const fileStream = fs.createReadStream(localPath);
    const fileName   = path.basename(localPath);

    const transcription = await groq.audio.transcriptions.create({
      file: await Groq.toFile(fileStream, fileName, { type: "audio/mpeg" }),
      model: "whisper-large-v3",
      response_format: "verbose_json",
      language: "en",
    });

    const text = (transcription as any)?.text?.trim() ?? "";

    return text.length > 30 ? text : null;
  } catch (e) {
    console.error("Whisper transcription error:", e);
    return null;
  }
}

// ── Priority 4: Groq LLM generation (last resort — clearly labeled) ──────────
async function generateLyrics(
  artistName: string, title: string, genre: string,
  mood: string, styleDna: string, additionalContext: string
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{
      role: "user",
      content: `You are a professional songwriter. Write complete original lyrics for this track.

Artist: ${artistName}
Title: ${title}
Genre: ${genre || "electronic/pop"}
Mood: ${mood || "introspective"}
Style DNA: ${styleDna || "none"}
Direction: ${additionalContext || "none"}

Write a complete song with labeled sections: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro].
Match the emotional tone of the title and genre. ~250-350 words.
Write ONLY the lyrics — no explanations.`,
    }],
    max_tokens: 800,
    temperature: 0.72,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { trackId, releaseId, additionalContext, forceGenerate } = await req.json();

    if (!trackId && !releaseId) {
      return NextResponse.json({ error: "trackId or releaseId required" }, { status: 400 });
    }

    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: "No artist profile" }, { status: 404 });

    const fullArtist = await db.artistProfile.findUnique({
      where: { id: artist.id },
      include: { links: true },
    });

    let track: any = null;
    let release: any = null;
    if (trackId) {
      track = await db.track.findUnique({ where: { id: trackId }, include: { release: true } });
      release = track?.release;
    } else {
      release = await db.release.findUnique({
        where: { id: releaseId },
        include: { tracks: { take: 1, orderBy: { trackNumber: "asc" } } },
      });
      track = release?.tracks?.[0] ?? null;
    }

    if (!track || !release) return NextResponse.json({ error: "Track not found" }, { status: 404 });
    if (release.artistId !== artist.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const title      = track.title as string;
    const artistName = artist.name as string;
    const genre      = fullArtist?.genres ?? "";

    // ── PRIORITY 1: Genius ────────────────────────────────────────────────────
    if (!forceGenerate) {
      const geniusUrl = await geniusSearch(artistName, title);
      if (geniusUrl) {
        const geniusLyrics = await geniusScrapeLyrics(geniusUrl);
        if (geniusLyrics) {
          await db.track.update({ where: { id: track.id }, data: { lyrics: geniusLyrics } });
          return NextResponse.json({ lyrics: geniusLyrics, source: "genius", saved: true });
        }
      }
    }

    // ── PRIORITY 2: Vault (user-entered) ──────────────────────────────────────
    if (track.lyrics && !forceGenerate) {
      return NextResponse.json({ lyrics: track.lyrics, source: "vault", saved: false });
    }

    // ── PRIORITY 3: Groq Whisper — transcribe from stored master audio ────────
    if (!forceGenerate && track.masterFileUrl) {
      const transcribed = await transcribeFromAudio(track.masterFileUrl, session.userId);
      if (transcribed) {
        await db.track.update({ where: { id: track.id }, data: { lyrics: transcribed } });
        return NextResponse.json({ lyrics: transcribed, source: "whisper", saved: true });
      }
    }

    // ── PRIORITY 4: Groq LLM generation (last resort) ─────────────────────────
    const recentPrompts = await (db as any).prompt?.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { enhancedGenre: true, enhancedMood: true, promptText: true },
    }).catch(() => []) ?? [];

    const styleDna = recentPrompts.map((p: any) =>
      `${p.enhancedGenre ?? ""} ${p.enhancedMood ?? ""}: ${p.promptText?.slice(0, 80)}`
    ).join(" | ");
    const mood = recentPrompts[0]?.enhancedMood ?? "";

    const generated = await generateLyrics(artistName, title, genre, mood, styleDna, additionalContext ?? "");
    if (!generated) return NextResponse.json({ error: "Could not generate lyrics" }, { status: 500 });

    await db.track.update({ where: { id: track.id }, data: { lyrics: generated } });
    return NextResponse.json({ lyrics: generated, source: "ai_generated", saved: true });

  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const trackId = new URL(req.url).searchParams.get("trackId");
    if (!trackId) return NextResponse.json({ error: "trackId required" }, { status: 400 });
    const track = await db.track.findUnique({ where: { id: trackId }, select: { lyrics: true, title: true } });
    return NextResponse.json({ lyrics: track?.lyrics ?? null, title: track?.title });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
