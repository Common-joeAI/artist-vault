import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getPrimaryArtistProfile } from '@/lib/artist-vault';
import { db } from '@/lib/db';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function parseJson(s: string | null | undefined): unknown[] {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return []; }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ dna: null });
    const dna = await db.styleDna.findUnique({ where: { artistId: artist.id } });
    return NextResponse.json({ dna, artist });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: 'No artist profile' }, { status: 400 });

    // Gather all vault data
    const releases = await db.release.findMany({ where: { artistId: artist.id }, include: { tracks: true }, take: 50 });
    const prompts = await db.prompt.findMany({ where: { artistId: artist.id }, take: 50 });

    // Tally tools
    const toolCount: Record<string, number> = {};
    for (const p of prompts) { toolCount[p.aiTool] = (toolCount[p.aiTool] || 0) + 1; }
    const topTools = Object.entries(toolCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);

    // Tally genres & moods from prompts
    const genreCount: Record<string, number> = {};
    const moodCount: Record<string, number> = {};
    const themeCount: Record<string, number> = {};
    const soundsLikeSet = new Set<string>();

    for (const p of prompts) {
      if (p.enhancedGenre) genreCount[p.enhancedGenre] = (genreCount[p.enhancedGenre] || 0) + 1;
      if (p.enhancedMood) moodCount[p.enhancedMood] = (moodCount[p.enhancedMood] || 0) + 1;
      parseJson(p.enhancedTags).forEach(t => { if (typeof t === 'string') themeCount[t] = (themeCount[t] || 0) + 1; });
    }

    // Also pull from artist genres field
    if (artist.genres) {
      artist.genres.split(',').map(g => g.trim()).filter(Boolean).forEach(g => { genreCount[g] = (genreCount[g] || 0) + 2; });
    }

    const topGenres = Object.entries(genreCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);
    const topMoods = Object.entries(moodCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);
    const topThemes = Object.entries(themeCount).sort((a,b) => b[1]-a[1]).slice(0,8).map(e => e[0]);

    // BPM range from tracks
    const bpms = releases.flatMap(r => r.tracks).map(t => t.bpm).filter(Boolean) as number[];
    const bpmRange = bpms.length ? { min: Math.min(...bpms), max: Math.max(...bpms), avg: Math.round(bpms.reduce((a,b)=>a+b,0)/bpms.length) } : null;

    // Build context for Groq summary
    const context = `
Artist: ${artist.name}
Bio: ${artist.bio || 'none'}
Releases: ${releases.map(r => r.title).join(', ') || 'none'}
Top genres: ${topGenres.join(', ') || 'unknown'}
Top moods: ${topMoods.join(', ') || 'unknown'}
Top themes: ${topThemes.join(', ') || 'unknown'}
AI Tools used: ${topTools.join(', ') || 'unknown'}
BPM range: ${bpmRange ? `${bpmRange.min}-${bpmRange.max} (avg ${bpmRange.avg})` : 'unknown'}
Recent prompts: ${prompts.slice(0,5).map(p => p.promptText.slice(0,80)).join(' | ') || 'none'}
`.trim();

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{
        role: 'user',
        content: `You are a music curator. Based on this AI artist's vault data, write their Style DNA.

${context}

Respond with ONLY valid JSON:
{
  "summary": "2-3 sentence description of their unique sound and style",
  "soundsLike": ["artist1", "artist2", "artist3"],
  "energyProfile": "low|medium|high",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`
      }],
      max_tokens: 300,
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    let groqResult: Record<string, unknown> = {};
    try { groqResult = JSON.parse(raw); } catch {}

    const dna = await db.styleDna.upsert({
      where: { artistId: artist.id },
      create: {
        artistId: artist.id,
        topGenres: JSON.stringify(topGenres),
        topMoods: JSON.stringify(topMoods),
        topThemes: JSON.stringify(topThemes),
        topTools: JSON.stringify(topTools),
        bpmRange: bpmRange ? JSON.stringify(bpmRange) : null,
        energyProfile: (groqResult.energyProfile as string) || null,
        soundsLike: groqResult.soundsLike ? JSON.stringify(groqResult.soundsLike) : null,
        summary: (groqResult.summary as string) || null,
        tags: groqResult.tags ? JSON.stringify(groqResult.tags) : null,
        lastComputedAt: new Date(),
      },
      update: {
        topGenres: JSON.stringify(topGenres),
        topMoods: JSON.stringify(topMoods),
        topThemes: JSON.stringify(topThemes),
        topTools: JSON.stringify(topTools),
        bpmRange: bpmRange ? JSON.stringify(bpmRange) : null,
        energyProfile: (groqResult.energyProfile as string) || null,
        soundsLike: groqResult.soundsLike ? JSON.stringify(groqResult.soundsLike) : null,
        summary: (groqResult.summary as string) || null,
        tags: groqResult.tags ? JSON.stringify(groqResult.tags) : null,
        lastComputedAt: new Date(),
      },
    });

    return NextResponse.json({ dna });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
