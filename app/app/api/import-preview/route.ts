import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildImportPreview } from "@/lib/import-adapters";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { urls?: string[] };
    let urls = (body.urls ?? []).filter(Boolean);

    if (!urls.length) {
      const artist = await getPrimaryArtistProfile();
      urls = artist?.links.map((link) => link.url) ?? [];
    }

    if (!urls.length) {
      return NextResponse.json({ error: "No artist links available to scan." }, { status: 400 });
    }

    const settled = await Promise.allSettled(urls.map((url) => buildImportPreview(url)));

    const previews = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    const errors = settled.flatMap((result) => (result.status === "rejected" ? [result.reason instanceof Error ? result.reason.message : "Import failed."] : []));

    return NextResponse.json({ previews, errors });
  } catch {
    return NextResponse.json({ error: "Unable to scan artist links." }, { status: 500 });
  }
}
