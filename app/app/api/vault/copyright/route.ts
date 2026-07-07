import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { trackId, releaseId } = await req.json();

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
    } else if (releaseId) {
      release = await db.release.findUnique({
        where: { id: releaseId },
        include: { tracks: { orderBy: { trackNumber: "asc" } } },
      });
      track = release?.tracks?.[0] ?? null;
    }

    if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });
    if (release.artistId !== artist.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const artistName  = artist.name as string;
    const trackTitle  = track?.title ?? release.title;
    const lyrics      = track?.lyrics ?? "";
    const isrc        = track?.isrc ?? "";
    const releaseDate = release.releaseDate ? new Date(release.releaseDate).toISOString().split("T")[0] : "";
    const genre       = fullArtist?.genres ?? "";
    const lyricsExcerpt = lyrics ? lyrics.split("\n").slice(0, 6).join("\n") : "";

    // ── AI: generate copyright description ──────────────────────────────────
    let copyrightDesc = "";
    if (lyrics) {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `Write a brief, professional copyright description for this musical work for submission to the US Copyright Office (Form PA). Keep it under 100 words. Be factual and formal.

Artist: ${artistName}
Title: ${trackTitle}
Genre: ${genre}
Release Date: ${releaseDate}
Lyrics excerpt:
${lyricsExcerpt}

Output only the description text, nothing else.`,
        }],
        max_tokens: 150,
        temperature: 0.3,
      });
      copyrightDesc = completion.choices[0]?.message?.content?.trim() ?? "";
    }

    // ── Build registration packages ─────────────────────────────────────────

    // US Copyright Office (eCO) — Form PA
    const copyright = {
      formType: "PA (Performing Arts)",
      title: trackTitle,
      yearCompleted: releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear(),
      authorName: artistName,
      authorNationality: "United States",
      workMadeForHire: "No",
      copyrightClaimant: artistName,
      transferStatement: "N/A — author is the claimant",
      description: copyrightDesc || `Original musical composition and sound recording titled "${trackTitle}" by ${artistName}.`,
      submissionUrl: "https://eco.copyright.gov/eService_enu/start.swe?SWECmd=GotoView&SWEView=Copyright+Registration+View",
      notes: [
        "File as a 'Sound Recording' + 'Musical Work' on a single Form SR if registering both in one filing ($65 vs $45).",
        "Upload your master audio file as the deposit copy.",
        "If registering lyrics only, use Form PA ($45).",
        "Keep your confirmation number — ASCAP will ask for it.",
      ],
    };

    // ASCAP Work Registration
    const ascap = {
      title: trackTitle,
      alternateTitle: "",
      isrc: isrc,
      iswc: "",
      releaseDate: releaseDate,
      genre: genre,
      writers: [{ name: artistName, role: "Composer/Lyricist", ipi: "", pro: (fullArtist as any)?.proOrg ?? "ASCAP", share: "100%" }],
      publishers: [],
      registrationUrl: "https://www.ascap.com/help/ascap-member-portal/how-to-register-works",
      notes: [
        "ASCAP is FREE when you register as both Artist and Publisher/Producer — make sure both roles are selected during signup.",
        "Use the ISRC if you have one — it links streaming royalties automatically.",
        "For AI-assisted works, ASCAP currently registers them as long as a human author is listed.",
        "After registering, add the ISWC number to your vault record.",
      ],
    };

    // BMI Work Registration  
    const bmi = {
      title: trackTitle,
      isrc: isrc,
      releaseDate: releaseDate,
      genre: genre,
      writers: [{ name: artistName, role: "Composer/Lyricist", share: "100%" }],
      registrationUrl: "https://songfile.bmi.com",
      notes: [
        "BMI SongFile → Add Titles → fill in the form.",
        "BMI is free to register individual works (no annual fee).",
        "Use SongFile for single registrations or the bulk upload for multiple tracks.",
      ],
    };

    // Genius submission helper
    const geniusTitle   = encodeURIComponent(trackTitle);
    const geniusArtist  = encodeURIComponent(artistName);
    const geniusSubmitUrl = `https://genius.com/songs/new?title=${geniusTitle}&primary_artist=${geniusArtist}`;

    const genius = {
      songTitle: trackTitle,
      primaryArtist: artistName,
      releaseDate: releaseDate,
      lyricsFormatted: lyrics || "(No lyrics in vault yet — add them in Lyrics Manager first)",
      submissionUrl: geniusSubmitUrl,
      instructions: [
        "1. Click 'Open Genius Submission' below — it pre-fills your title and artist.",
        "2. Paste your lyrics from the box below into the Genius editor.",
        "3. Add section tags: [Verse 1], [Chorus], etc.",
        "4. Submit for community review (usually approved within 24-48 hours).",
        "5. Once live, copy the Genius URL back into your vault track record.",
      ],
    };

    const proOrg = (fullArtist as any)?.proOrg ?? null;
    return NextResponse.json({ copyright, ascap, bmi, genius, lyricsExcerpt, hasLyrics: !!lyrics, proOrg });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
