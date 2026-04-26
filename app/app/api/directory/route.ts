import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get('genre');
  const tool = searchParams.get('tool');
  const mood = searchParams.get('mood');

  const artists = await db.artistProfile.findMany({
    where: { isPublic: true },
    include: { links: true },
    orderBy: { updatedAt: 'desc' },
    take: 60,
  });

  // Get style DNA for all artists
  const dnas = await db.styleDna.findMany({
    where: { artistId: { in: artists.map(a => a.id) } },
  });
  const dnaMap = Object.fromEntries(dnas.map(d => [d.artistId, d]));

  // Filter by genre/tool/mood if provided
  let results = artists.map(a => ({ ...a, dna: dnaMap[a.id] || null }));

  if (genre) {
    results = results.filter(a => {
      try { const g: string[] = JSON.parse(a.dna?.topGenres || '[]'); return g.some(x => x.toLowerCase().includes(genre.toLowerCase())); } catch { return false; }
    });
  }
  if (tool) {
    results = results.filter(a => {
      try { const t: string[] = JSON.parse(a.dna?.topTools || '[]'); return t.some(x => x.toLowerCase().includes(tool.toLowerCase())); } catch { return false; }
    });
  }
  if (mood) {
    results = results.filter(a => {
      try { const m: string[] = JSON.parse(a.dna?.topMoods || '[]'); return m.some(x => x.toLowerCase().includes(mood.toLowerCase())); } catch { return false; }
    });
  }

  return NextResponse.json({ artists: results });
}
