import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getPrimaryArtistProfile } from '@/lib/artist-vault';
import { db } from '@/lib/db';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { title, vibe, genre, aiTool, additionalContext, releaseId, trackId } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    // ── Pull existing vault context ──────────────────────────────────────────
    let vaultContext = '';

    try {
      const artist = await getPrimaryArtistProfile(session.userId);

      if (artist) {
        // Artist profile
        vaultContext += `Artist Name: ${artist.name}\n`;
        if (artist.bio) vaultContext += `Artist Bio: ${artist.bio}\n`;
        if (artist.genres) vaultContext += `Artist Genres: ${artist.genres}\n`;

        // Specific release if provided
        if (releaseId) {
          const release = await db.release.findUnique({ where: { id: releaseId }, include: { tracks: true } });
          if (release) {
            vaultContext += `Release Type: ${release.releaseType}\n`;
            if (release.releaseDate) vaultContext += `Release Date: ${release.releaseDate.toISOString().split('T')[0]}\n`;
            if (release.notes) vaultContext += `Release Notes: ${release.notes}\n`;
            if (release.tracks.length) {
              const trackList = release.tracks.map(t => {
                let info = t.title;
                if (t.bpm) info += ` (BPM: ${t.bpm})`;
                return info;
              }).join(', ');
              vaultContext += `Tracks: ${trackList}\n`;
            }
          }
        }

        // Specific track if provided
        if (trackId) {
          const track = await db.track.findUnique({ where: { id: trackId } });
          if (track) {
            if (track.bpm) vaultContext += `Track BPM: ${track.bpm}\n`;
            if (track.lyrics) vaultContext += `Lyrics snippet: ${track.lyrics.slice(0, 300)}\n`;
          }
        }

        // Recent releases for style context
        const recentReleases = await db.release.findMany({
          where: { artistId: artist.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { tracks: { take: 3 } },
        });
        if (recentReleases.length > 0) {
          const titles = recentReleases.map(r => r.title).join(', ');
          vaultContext += `Previous releases: ${titles}\n`;
        }

        // Recent prompts for style DNA
        const recentPrompts = await db.prompt.findMany({
          where: { artistId: artist.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
        if (recentPrompts.length > 0) {
          const promptSnippets = recentPrompts
            .map(p => `[${p.aiTool}] ${p.enhancedGenre ?? ''} ${p.enhancedMood ?? ''} — ${p.promptText.slice(0, 100)}`)
            .join(' | ');
          vaultContext += `Past prompt styles: ${promptSnippets}\n`;
        }
      }
    } catch {
      // vault context is bonus — never block generation
    }

    // ── Groq generation ──────────────────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{
        role: 'user',
        content: `You are an expert music metadata writer for AI-generated music. Generate complete, professional release metadata.

=== EXISTING VAULT DATA (use this to stay consistent with the artist's style) ===
${vaultContext || 'No existing vault data available.'}

=== NEW TRACK TO GENERATE METADATA FOR ===
Track Title: ${title}
Vibe/Feel: ${vibe || 'not specified'}
Genre: ${genre || 'not specified'}
AI Tool Used: ${aiTool || 'not specified'}
Additional Context: ${additionalContext || 'none'}

Use the vault data above to keep the metadata consistent with this artist's existing style, genre, and brand. If vault data reveals their typical BPM range, genre, or sound — reflect that. Generate metadata that would make this track stand out on streaming platforms and appeal to playlist curators.

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
  "explicit": false,
  "vault_context_used": true
}`
      }],
      max_tokens: 700,
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    let metadata: Record<string, unknown> = {};
    try { metadata = JSON.parse(raw); } catch { metadata = { raw }; }

    return NextResponse.json({ metadata, vaultContextUsed: !!vaultContext });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
