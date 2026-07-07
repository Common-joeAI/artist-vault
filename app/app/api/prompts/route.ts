import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { getPrimaryArtistProfile } from '@/lib/artist-vault';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function enhanceWithGroq(promptText: string, aiTool: string) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{
        role: 'user',
        content: `You are a music metadata expert. Analyze this AI music generation prompt and extract/infer metadata.

AI Tool: ${aiTool}
Prompt: ${promptText}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "title": "suggested track title based on the prompt",
  "genre": "primary genre",
  "mood": "mood/vibe (e.g. dark, uplifting, melancholic, energetic)",
  "description": "1-2 sentence description of what this track sounds like",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`
      }],
      max_tokens: 300,
      temperature: 0.4,
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// GET  -  list prompts for current artist
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ prompts: [] });

    const prompts = await db.prompt.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ prompts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST  -  create a new prompt (with Groq enhancement)
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: 'No artist profile' }, { status: 400 });

    const body = await req.json();
    const { promptText, aiTool = 'suno', aiModel, styleTags, trackId, releaseId, resultRating, resultNotes, isPublic } = body;

    if (!promptText?.trim()) return NextResponse.json({ error: 'Prompt text required' }, { status: 400 });

    // Enhance with Groq
    const enhanced = await enhanceWithGroq(promptText, aiTool);

    const prompt = await db.prompt.create({
      data: {
        artistId: artist.id,
        trackId: trackId || null,
        releaseId: releaseId || null,
        promptText: promptText.trim(),
        aiTool,
        aiModel: aiModel || null,
        styleTags: styleTags ? JSON.stringify(styleTags) : null,
        enhancedTitle: enhanced.title || null,
        enhancedGenre: enhanced.genre || null,
        enhancedMood: enhanced.mood || null,
        enhancedDescription: enhanced.description || null,
        enhancedTags: enhanced.tags ? JSON.stringify(enhanced.tags) : null,
        groqEnhancedAt: enhanced.title ? new Date() : null,
        resultRating: resultRating || null,
        resultNotes: resultNotes || null,
        isPublic: isPublic || false,
      },
    });

    return NextResponse.json({ prompt });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
