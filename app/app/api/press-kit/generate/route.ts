import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { tone = "editorial" } = await req.json().catch(() => ({}));

    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: "No artist profile" }, { status: 404 });

    const fullArtist = await db.artistProfile.findUnique({
      where: { id: artist.id },
      include: {
        links: true,
        releases: {
          orderBy: { releaseDate: "desc" },
          take: 5,
          include: { tracks: { orderBy: { trackNumber: "asc" }, take: 3 } },
        },
      },
    });
    if (!fullArtist) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const styleDna = await db.styleDna.findFirst({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
    });

    const topTracks = (fullArtist.releases ?? []).flatMap((r: any) => r.tracks ?? []).slice(0, 5);
    const lyricsExcerpts = topTracks
      .filter((t: any) => t.lyrics)
      .map((t: any) => ({ title: t.title as string, excerpt: (t.lyrics as string).split("\n").slice(0, 4).join("\n") }));

    const releaseList = (fullArtist.releases ?? []).map(
      (r: any) => `${r.title} (${r.releaseType}, ${r.releaseDate ? new Date(r.releaseDate).getFullYear() : "?"})`
    );
    const streamingLinks = (fullArtist.links ?? []).map((l: any) => `${l.label}: ${l.url}`);
    const dnaDesc = (styleDna as any)?.description ?? "";
    const proOrg = (fullArtist as any).proOrg ?? "";

    const bioCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Write a professional ${tone} artist biography for a music press kit. 3 paragraphs max. No bullet points. Do not start with the artist name.

Artist: ${fullArtist.name}
Genre/Style: ${dnaDesc || "AI-generated electronic music"}
Existing bio: ${fullArtist.bio || "none"}
Releases: ${releaseList.join(", ") || "none yet"}
PRO: ${proOrg || "independent"}
Tone: ${tone} — editorial=music blog style, formal=industry/radio, hype=energetic promo

Output only the biography text.`,
      }],
      max_tokens: 400,
      temperature: 0.7,
    });
    const generatedBio = bioCompletion.choices[0]?.message?.content?.trim() ?? (fullArtist.bio as string) ?? "";

    const slug = (fullArtist.name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const epkUrl = `https://aiartistvault.com/presskit/${slug}`;

    const existing = await db.pressKit.findFirst({ where: { artistId: artist.id } });
    const pkData = {
      title: `${fullArtist.name} — Press Kit`,
      bio: generatedBio,
      tone,
      slug,
      isPublic: true,
      topTrackIds: JSON.stringify(topTracks.map((t: any) => t.id)),
      lyricsExcerpts: JSON.stringify(lyricsExcerpts),
      streamingLinks: JSON.stringify(streamingLinks),
      epkUrl,
      photoUrl: fullArtist.photoUrl ?? "",
    };

    if (existing) {
      await db.pressKit.update({ where: { id: existing.id }, data: pkData });
    } else {
      await db.pressKit.create({ data: { artistId: artist.id, ...pkData } });
    }

    return NextResponse.json({
      bio: generatedBio,
      slug,
      epkUrl,
      lyricsExcerpts,
      releases: releaseList,
      streamingLinks,
      styleDna: dnaDesc,
      proOrg,
      artistName: fullArtist.name,
      photoUrl: fullArtist.photoUrl,
      tone,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
