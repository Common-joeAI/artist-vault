import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const body = await req.json();
    const { title, vibe, genre, aiTool, additionalContext } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{
        role: 'user',
        content: `You are an expert music metadata writer for AI-generated music. Generate complete, professional release metadata.

Track Title: ${title}
Vibe/Feel: ${vibe || 'not specified'}
Genre: ${genre || 'not specified'}
AI Tool Used: ${aiTool || 'not specified'}
Additional Context: ${additionalContext || 'none'}

Generate metadata that would make this track stand out on streaming platforms and appeal to playlist curators.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "title": "polished version of the title",
  "subtitle": "optional subtitle or featuring info",
  "genre": "primary genre",
  "subgenre": "more specific subgenre",
  "mood": ["mood1", "mood2", "mood3"],
  "themes": ["theme1", "theme2", "theme3"],
  "bpm_estimate": 120,
  "key": "suggested musical key",
  "energy_level": "low|medium|high",
  "description": "2-3 sentence description for streaming platforms and press kits",
  "short_bio": "1 sentence punchy description for playlists",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "similar_artists": ["artist1", "artist2", "artist3"],
  "playlist_pitch": "2-3 sentence pitch to send to playlist curators",
  "press_blurb": "1 sentence press-worthy description",
  "release_type": "SINGLE|EP|ALBUM",
  "explicit": false
}`
      }],
      max_tokens: 600,
      temperature: 0.6,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    let metadata: Record<string, unknown> = {};
    try { metadata = JSON.parse(raw); } catch { metadata = { raw }; }

    return NextResponse.json({ metadata });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
