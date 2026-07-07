import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { db } from "@/lib/db";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

const YT_DLP  = "/home/cjoe/yt-dlp";
const FFMPEG  = "/home/cjoe/ffmpeg";
const UPLOAD_DIR  = process.env.ARTIST_VAULT_UPLOAD_DIR  ?? "./public/uploads";
const UPLOAD_BASE = process.env.ARTIST_VAULT_UPLOAD_PUBLIC_BASE ?? "/uploads";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { trackId, releaseId, youtubeUrl, soundcloudUrl } = await req.json();

    if (!trackId && !releaseId) {
      return NextResponse.json({ error: "trackId or releaseId required" }, { status: 400 });
    }

    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: "No artist profile" }, { status: 404 });

    // Resolve track + release
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

    if (!track)    return NextResponse.json({ error: "Track not found" },  { status: 404 });
    if (!release)  return NextResponse.json({ error: "Release not found" }, { status: 404 });

    // Ownership check — artist must belong to the session user
    if (release.artistId !== artist.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Already have a master?
    if (track.masterFileUrl) {
      return NextResponse.json({ alreadyExists: true, masterFileUrl: track.masterFileUrl });
    }

    // Best source: prefer explicit URL arg, then release fields
    const sourceUrl =
      youtubeUrl ||
      soundcloudUrl ||
      release.youtubeUrl ||
      release.youtubeMusicUrl ||
      null;

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "No audio source URL available. Enhance metadata first to discover platform links." },
        { status: 400 }
      );
    }

    // ── Per-user scoped directory ──────────────────────────────────────────
    // Layout: /public/uploads/masters/{userId}/{trackId}_{safeTitle}.mp3
    const userMastersDir = path.resolve(
      process.cwd(),
      UPLOAD_DIR,
      "masters",
      session.userId          // <-- namespace by user
    );
    fs.mkdirSync(userMastersDir, { recursive: true });

    const safeTitle = track.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
    const fileBase  = `${track.id}_${safeTitle}`;
    const outTemplate = path.join(userMastersDir, `${fileBase}.%(ext)s`);
    const mp3Path     = path.join(userMastersDir, `${fileBase}.mp3`);

    // ── Run yt-dlp ─────────────────────────────────────────────────────────
    const args = [
      sourceUrl,
      "--no-playlist",
      "--extract-audio",
      "--audio-format", "mp3",
      "--audio-quality", "0",
      "--ffmpeg-location", FFMPEG,
      "--output", outTemplate,
      "--no-progress",
      "--quiet",
    ];

    try {
      await execFileAsync(YT_DLP, args, { timeout: 120_000 });
    } catch (e: any) {
      return NextResponse.json(
        { error: `Audio fetch failed: ${e.message?.slice(0, 200)}` },
        { status: 500 }
      );
    }

    // Find the output file (yt-dlp may rename extension)
    let finalFile: string | null = null;
    if (fs.existsSync(mp3Path)) {
      finalFile = mp3Path;
    } else {
      const candidates = fs.readdirSync(userMastersDir).filter(f => f.startsWith(`${track.id}_`));
      if (candidates.length > 0) finalFile = path.join(userMastersDir, candidates[0]);
    }

    if (!finalFile) {
      return NextResponse.json({ error: "Download completed but output file not found" }, { status: 500 });
    }

    const fileName  = path.basename(finalFile);
    // Public URL includes userId segment for clean namespacing
    const publicUrl = `${UPLOAD_BASE}/masters/${session.userId}/${fileName}`;
    const sizeMb    = (fs.statSync(finalFile).size / (1024 * 1024)).toFixed(1);

    // ── Persist to vault ───────────────────────────────────────────────────
    await db.track.update({
      where: { id: track.id },
      data: {
        masterFileUrl:   publicUrl,
        audioPreviewUrl: publicUrl,
      },
    });

    await db.release.update({
      where: { id: release.id },
      data: { masterUploaded: true },
    });

    return NextResponse.json({
      success: true,
      masterFileUrl: publicUrl,
      fileName,
      sizeMb,
      source: sourceUrl,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
