import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(_req: NextRequest) {
  await requireSession();
  const artist = await getPrimaryArtistProfile();
  if (!artist) return NextResponse.json({ error: "No artist profile found" }, { status: 400 });

  const styleDna = await db.styleDna.findUnique({ where: { artistId: artist.id } });
  const releases = artist.releases.slice(0, 10);
  const trackCount = releases.reduce((sum, r) => sum + ((r as any).tracks?.length ?? 0), 0);

  const releaseList = releases.map((r) => {
    const tracks = ((r as any).tracks ?? []).map((t: any) => `"${t.title}"${t.isrc ? ` (ISRC: ${t.isrc})` : ""}`).join(", ");
    return `- ${r.releaseType}: "${r.title}"${r.releaseDate ? ` (${new Date(r.releaseDate).getFullYear()})` : ""}${tracks ? `  -  tracks: ${tracks}` : ""}`;
  }).join("\n");

  const styleSummary = styleDna ? [
    styleDna.topGenres ? `Genres: ${styleDna.topGenres}` : "",
    styleDna.topMoods ? `Moods: ${styleDna.topMoods}` : "",
    styleDna.soundsLike ? `Sounds Like: ${styleDna.soundsLike}` : "",
    styleDna.energyProfile ? `Energy: ${styleDna.energyProfile}` : "",
    styleDna.summary ? `Style summary: ${styleDna.summary}` : "",
  ].filter(Boolean).join("\n") : "No Style DNA computed yet.";

  const prompt = `You are a music industry publicist writing radio-submission press kit bios for an independent AI music artist.

Artist: ${artist.name}
Bio on file: ${artist.bio ?? "None"}
Location: ${artist.location ?? "Unknown"}
Catalog (${releases.length} releases, ~${trackCount} tracks):
${releaseList}

Style DNA:
${styleSummary}

Write TWO bios:
1. SHORT BIO (75 words max): punchy, radio-friendly, third person. Lead with what makes this artist distinctive as an AI music creator. 
2. LONG BIO (200 words max): third person, suitable for radio program directors. Include the artist's creative approach, catalog highlights, and sonic identity. Mention specific release titles where relevant.

Format your response EXACTLY as:
SHORT_BIO: [short bio text here]
LONG_BIO: [long bio text here]

Do not include any other text.`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const shortMatch = text.match(/SHORT_BIO:\s*([\s\S]*?)(?=LONG_BIO:|$)/i);
  const longMatch = text.match(/LONG_BIO:\s*([\s\S]*?)$/i);

  return NextResponse.json({
    shortBio: shortMatch?.[1]?.trim() ?? "",
    longBio: longMatch?.[1]?.trim() ?? "",
  });
}
