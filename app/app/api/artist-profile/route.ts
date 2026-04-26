import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getPrimaryArtistProfile } from '@/lib/artist-vault';
import { db } from '@/lib/db';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: 'No artist profile' }, { status: 400 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.isPublic === 'boolean') updates.isPublic = body.isPublic;
    if (typeof body.bio === 'string') updates.bio = body.bio;
    if (typeof body.location === 'string') updates.location = body.location;
    if (typeof body.website === 'string') updates.website = body.website;
    if (typeof body.genres === 'string') updates.genres = body.genres;

    // Auto-generate slug if going public and no slug yet
    if (body.isPublic && !artist.slug) {
      const base = slugify(artist.name);
      let slug = base;
      let i = 1;
      while (await db.artistProfile.findUnique({ where: { slug } })) {
        slug = `${base}-${i++}`;
      }
      updates.slug = slug;
    }

    const updated = await db.artistProfile.update({ where: { id: artist.id }, data: updates });
    return NextResponse.json({ artist: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
