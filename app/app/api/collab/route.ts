import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getPrimaryArtistProfile } from '@/lib/artist-vault';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const role = searchParams.get('role');

  const where: Record<string, unknown> = { isOpen: true };
  if (type) where.type = type;
  if (role) where.role = { contains: role };

  const posts = await db.collabPost.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });

  // Attach artist info
  const artistIds = [...new Set(posts.map(p => p.artistId))];
  const artists = await db.artistProfile.findMany({ where: { id: { in: artistIds } } });
  const artistMap = Object.fromEntries(artists.map(a => [a.id, a]));

  return NextResponse.json({ posts: posts.map(p => ({ ...p, artist: artistMap[p.artistId] || null })) });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: 'No artist profile' }, { status: 400 });

    const body = await req.json();
    const { title, description, type, role, genres, moods, tools, contactMethod, contactValue } = body;
    if (!title || !description || !role) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const post = await db.collabPost.create({
      data: {
        artistId: artist.id, title, description,
        type: type || 'SEEKING', role,
        genres: genres ? JSON.stringify(genres) : null,
        moods: moods ? JSON.stringify(moods) : null,
        tools: tools ? JSON.stringify(tools) : null,
        contactMethod: contactMethod || null,
        contactValue: contactValue || null,
      },
    });
    return NextResponse.json({ post });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
